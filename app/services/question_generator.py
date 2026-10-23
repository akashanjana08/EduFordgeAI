"""Question generation orchestration service supporting batched and single-question calls."""
from __future__ import annotations

from typing import List, Tuple

from app.models.question import (
    Question,
    QuestionBatchResponse,
    QuestionConfiguration,
    QuestionTypeConfig,
)
from app.models.question_paper import ValidationResult
from app.services.llm_service import BaseLLMService, LLMServiceError
from app.services.prompt_service import PromptService
from app.services.validation_service import ValidationService
from app.utils.logger import get_logger, log_operation

logger = get_logger("eduforge.generator")


class QuestionGeneratorService:
    """Coordinates AI prompt creation, batched LLM generation, and Pydantic/business validation."""

    def __init__(self, llm_service: BaseLLMService) -> None:
        self.llm = llm_service

    def generate_all_questions(
        self, config: QuestionConfiguration
    ) -> Tuple[List[Question], ValidationResult]:
        """Generate all enabled question types in batches and validate the complete paper."""
        if not config.enabled_configs:
            raise ValueError("Please enable at least one question type before generating.")

        if config.configured_total_marks != config.maximum_marks:
            raise ValueError(
                f"Configured marks ({config.configured_total_marks}) must equal "
                f"Maximum Marks ({config.maximum_marks}) before invoking AI generation."
            )

        generated: List[Question] = []
        current_index = 1
        batch_limit = max(1, self.llm.config.batch_size)

        for type_cfg in config.enabled_configs:
            remaining = type_cfg.count
            while remaining > 0:
                chunk_size = min(remaining, batch_limit)
                sub_cfg = QuestionTypeConfig(
                    question_type=type_cfg.question_type,
                    enabled=True,
                    count=chunk_size,
                    marks_per_question=type_cfg.marks_per_question,
                    difficulty=type_cfg.difficulty,
                    num_options=type_cfg.num_options,
                    subjective_subtype=type_cfg.subjective_subtype,
                    section_title=type_cfg.section_title,
                )
                prompt = PromptService.build_generation_prompt(
                    config=config,
                    type_config=sub_cfg,
                    start_index=current_index,
                    existing_questions=[q.question for q in generated],
                )
                raw_dict = self.llm.generate_questions(prompt)
                batch_resp = QuestionBatchResponse.model_validate(raw_dict)
                for idx, item in enumerate(batch_resp.questions[:chunk_size]):
                    item.id = f"Q{current_index + idx:03d}"
                    item.type = type_cfg.question_type
                    item.marks = type_cfg.marks_per_question
                    generated.append(item)

                current_index += chunk_size
                remaining -= chunk_size

        validation = ValidationService.validate_paper(config, generated)
        log_operation(
            logger,
            operation="generate_all_questions",
            message="Completed question generation and validation.",
            model_name=self.llm.config.model_name,
            question_count=len(generated),
            validation_status="VALID" if validation.is_valid else "INVALID",
        )
        return generated, validation

    def regenerate_single_question(
        self,
        config: QuestionConfiguration,
        questions: List[Question],
        question_id: str,
    ) -> Tuple[List[Question], ValidationResult]:
        """Regenerate only the specified question ID to control Gemini token costs."""
        target_idx = next(
            (i for i, q in enumerate(questions) if q.id == question_id), -1
        )
        if target_idx == -1:
            raise ValueError(f"Question '{question_id}' not found in current paper.")

        target_q = questions[target_idx]
        other_texts = [q.question for i, q in enumerate(questions) if i != target_idx]
        prompt = PromptService.build_single_regeneration_prompt(
            config=config,
            target_question=target_q,
            existing_questions=other_texts,
        )
        raw_dict = self.llm.generate_questions(prompt)
        batch_resp = QuestionBatchResponse.model_validate(raw_dict)
        if not batch_resp.questions:
            raise LLMServiceError(f"AI model did not return a replacement for {question_id}.")

        replacement = batch_resp.questions[0]
        replacement.id = target_q.id
        replacement.type = target_q.type
        replacement.marks = target_q.marks
        replacement.section_name = target_q.section_name

        updated_list = list(questions)
        updated_list[target_idx] = replacement
        validation = ValidationService.validate_paper(config, updated_list)
        return updated_list, validation
