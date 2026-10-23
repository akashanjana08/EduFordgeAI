"""Application-side validation service for questions, marks, difficulty, and duplicates."""
from __future__ import annotations

from difflib import SequenceMatcher
from typing import Counter, List, Tuple

from app.models.question import (
    DifficultyLevel,
    Question,
    QuestionConfiguration,
    QuestionType,
)
from app.models.question_paper import ValidationCheckItem, ValidationResult
from app.utils.helpers import normalize_question_text


class ValidationService:
    """Validates generated questions against all academic and structural constraints."""

    DUPLICATE_SIMILARITY_THRESHOLD = 0.84

    @classmethod
    def detect_duplicates(cls, questions: List[Question]) -> List[Tuple[str, str, float]]:
        """Return pairs of question IDs whose normalized text exceeds similarity threshold."""
        duplicates: List[Tuple[str, str, float]] = []
        normalized = [(q.id, normalize_question_text(q.question)) for q in questions]
        for i in range(len(normalized)):
            id_a, text_a = normalized[i]
            if not text_a:
                continue
            tokens_a = set(text_a.split())
            for j in range(i + 1, len(normalized)):
                id_b, text_b = normalized[j]
                if not text_b:
                    continue
                if text_a == text_b:
                    duplicates.append((id_a, id_b, 1.0))
                    continue
                seq_ratio = SequenceMatcher(None, text_a, text_b).ratio()
                tokens_b = set(text_b.split())
                union_len = len(tokens_a | tokens_b)
                jaccard = len(tokens_a & tokens_b) / union_len if union_len else 0.0
                score = max(seq_ratio, jaccard)
                if score >= cls.DUPLICATE_SIMILARITY_THRESHOLD:
                    duplicates.append((id_a, id_b, round(score, 2)))
        return duplicates

    @classmethod
    def validate_mcq_questions(
        cls, questions: List[Question], expected_options: int = 4
    ) -> Tuple[bool, List[str]]:
        """Ensure every MCQ has the required number of distinct options and 1 valid answer."""
        errors: List[str] = []
        for q in questions:
            if q.type != QuestionType.MCQ:
                continue
            if not q.options or len(q.options) != expected_options:
                actual_len = len(q.options) if q.options else 0
                errors.append(
                    f"{q.id}: Expected exactly {expected_options} options, got {actual_len}."
                )
                continue
            cleaned_opts = [opt.strip() for opt in q.options if opt and opt.strip()]
            if len(set(o.lower() for o in cleaned_opts)) != len(cleaned_opts):
                errors.append(f"{q.id}: MCQ contains duplicate option choices.")
            if not q.correct_answer or not q.correct_answer.strip():
                errors.append(f"{q.id}: Missing correct answer for MCQ.")
        return len(errors) == 0, errors

    @classmethod
    def validate_numeric_questions(cls, questions: List[Question]) -> Tuple[bool, List[str]]:
        """Ensure numeric questions include a problem statement, calculation, and answer."""
        errors: List[str] = []
        for q in questions:
            if q.type != QuestionType.NUMERIC:
                continue
            if not q.correct_answer or not q.correct_answer.strip():
                errors.append(f"{q.id}: Numeric question is missing a verified correct_answer.")
            if not (q.solution or q.required_calculation):
                errors.append(f"{q.id}: Numeric question is missing calculation steps.")
        return len(errors) == 0, errors

    @classmethod
    def validate_paper(
        cls, config: QuestionConfiguration, questions: List[Question]
    ) -> ValidationResult:
        """Perform full application-side verification of generated questions against configuration."""
        errors: List[str] = []
        warnings: List[str] = []

        expected_count = config.configured_total_questions
        actual_count = len(questions)
        count_ok = expected_count == actual_count and actual_count > 0
        if not count_ok:
            errors.append(
                f"Question count mismatch: configured {expected_count} questions, but have {actual_count}."
            )

        expected_marks = config.maximum_marks
        configured_marks = config.configured_total_marks
        actual_marks = sum(q.marks for q in questions)
        marks_ok = (configured_marks == expected_marks) and (actual_marks == expected_marks)
        if configured_marks != expected_marks:
            errors.append(
                f"Configured question types total {configured_marks} marks, which does not equal Maximum Marks ({expected_marks})."
            )
        if actual_marks != expected_marks:
            errors.append(
                f"Generated questions total {actual_marks} marks, which does not equal Maximum Marks ({expected_marks})."
            )

        # Type counts check
        expected_by_type = Counter()
        for tc in config.enabled_configs:
            expected_by_type[tc.question_type] += tc.count
        actual_by_type = Counter(q.type for q in questions)
        types_ok = expected_by_type == actual_by_type
        if not types_ok:
            errors.append("Generated question type distribution does not match requested configuration.")

        # Difficulty validation
        allowed_difficulties = {"Easy", "Moderate", "Difficult"}
        difficulty_ok = all(q.difficulty in allowed_difficulties for q in questions)
        if config.global_difficulty == DifficultyLevel.MIXED:
            dist = config.mixed_distribution
            if dist.easy_pct + dist.moderate_pct + dist.difficult_pct != 100:
                difficulty_ok = False
                errors.append("Mixed difficulty percentages do not sum to 100%.")
        if not difficulty_ok:
            errors.append("One or more questions have an invalid difficulty level.")

        # Duplicate detection
        dup_tuples = cls.detect_duplicates(questions)
        no_duplicates = len(dup_tuples) == 0
        dup_labels = [f"{a} & {b} ({int(score * 100)}% similar)" for a, b, score in dup_tuples]
        if not no_duplicates:
            errors.append(f"Duplicate or near-duplicate questions detected: {', '.join(dup_labels)}")

        # MCQ & Numeric validation
        mcq_cfg = next(
            (c for c in config.enabled_configs if c.question_type == QuestionType.MCQ), None
        )
        expected_opts = mcq_cfg.num_options if mcq_cfg else 4
        mcq_ok, mcq_errors = cls.validate_mcq_questions(questions, expected_options=expected_opts)
        errors.extend(mcq_errors)

        numeric_ok, num_errors = cls.validate_numeric_questions(questions)
        errors.extend(num_errors)

        checks = [
            ValidationCheckItem(
                key="count",
                label="Question count validated",
                passed=count_ok,
                message=f"{actual_count} / {expected_count} questions present",
            ),
            ValidationCheckItem(
                key="marks",
                label="Marks validated",
                passed=marks_ok,
                message=f"Total Marks: {actual_marks} / {expected_marks}",
            ),
            ValidationCheckItem(
                key="difficulty",
                label="Difficulty validated",
                passed=difficulty_ok,
                message=f"Target: {config.global_difficulty.value}",
            ),
            ValidationCheckItem(
                key="types",
                label="Question types validated",
                passed=types_ok and mcq_ok and numeric_ok,
                message=f"{len(actual_by_type)} enabled question type(s) verified",
            ),
            ValidationCheckItem(
                key="duplicates",
                label="No duplicate questions detected",
                passed=no_duplicates,
                message="100% unique questions" if no_duplicates else f"{len(dup_tuples)} duplicate pair(s)",
            ),
        ]

        is_valid = (
            count_ok
            and marks_ok
            and difficulty_ok
            and types_ok
            and no_duplicates
            and mcq_ok
            and numeric_ok
        )

        return ValidationResult(
            is_valid=is_valid,
            count_validated=count_ok,
            marks_validated=marks_ok,
            difficulty_validated=difficulty_ok,
            question_types_validated=types_ok,
            no_duplicates_detected=no_duplicates,
            mcq_validated=mcq_ok,
            numeric_validated=numeric_ok,
            expected_questions=expected_count,
            actual_questions=actual_count,
            expected_marks=expected_marks,
            actual_marks=actual_marks,
            duplicate_pairs=dup_labels,
            errors=errors,
            warnings=warnings,
            checks=checks,
        )
