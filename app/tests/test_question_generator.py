"""Unit tests for QuestionGeneratorService with mocked Gemini LLM calls."""
from __future__ import annotations

from typing import Optional
import pytest

from app.config.model_config import LLMConfig
from app.models.question import (
    DifficultyLevel,
    QuestionConfiguration,
    QuestionType,
    QuestionTypeConfig,
)
from app.services.llm_service import BaseLLMService, LLMServiceError
from app.services.question_generator import QuestionGeneratorService


class MockLLMService(BaseLLMService):
    """Deterministic mock LLM service that never calls external Gemini endpoints."""

    def __init__(self, response_text: str) -> None:
        super().__init__(LLMConfig(model_name="mock-gemini-3.1-flash-lite", batch_size=10))
        self.response_text = response_text

    def generate(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        return self.response_text


def test_question_generator_batch_success() -> None:
    mock_json = """
    {
      "questions": [
        {
          "id": "Q001",
          "type": "mcq",
          "question": "Which of the following numbers is irrational?",
          "options": ["2", "3.14", "sqrt(2)", "4/5"],
          "correct_answer": "sqrt(2)",
          "marks": 2,
          "difficulty": "Easy",
          "topic": "Real Numbers",
          "solution": "sqrt(2) cannot be expressed as p/q."
        },
        {
          "id": "Q002",
          "type": "mcq",
          "question": "What is the degree of a quadratic polynomial?",
          "options": ["1", "2", "3", "0"],
          "correct_answer": "2",
          "marks": 2,
          "difficulty": "Easy",
          "topic": "Polynomials",
          "solution": "A quadratic polynomial has highest power 2."
        }
      ]
    }
    """
    config = QuestionConfiguration(
        class_name="Grade 10",
        subject="Mathematics",
        maximum_marks=4,
        topics=["Real Numbers", "Polynomials"],
        type_configs=[
            QuestionTypeConfig(
                question_type=QuestionType.MCQ,
                enabled=True,
                count=2,
                marks_per_question=2,
                difficulty=DifficultyLevel.EASY,
            )
        ],
    )
    service = QuestionGeneratorService(MockLLMService(mock_json))
    questions, validation = service.generate_all_questions(config)
    assert len(questions) == 2
    assert validation.is_valid is True
    assert validation.actual_marks == 4


def test_invalid_gemini_json_raises_error() -> None:
    bad_llm = MockLLMService("Not valid JSON output at all")
    with pytest.raises(LLMServiceError):
        bad_llm.generate_questions("test prompt")


def test_single_question_regeneration() -> None:
    initial_json = """
    {
      "questions": [
        {
          "id": "Q001",
          "type": "numeric",
          "question": "Find the roots of x^2 - 5x + 6 = 0.",
          "correct_answer": "x = 2, 3",
          "marks": 4,
          "difficulty": "Moderate",
          "topic": "Quadratic Equations",
          "solution": "(x-2)(x-3) = 0 => x = 2, 3",
          "required_calculation": "Factorization of quadratic equation"
        }
      ]
    }
    """
    replacement_json = """
    {
      "questions": [
        {
          "id": "Q001",
          "type": "numeric",
          "question": "Calculate the discriminant of 2x^2 - 4x + 3 = 0.",
          "correct_answer": "-8",
          "marks": 4,
          "difficulty": "Moderate",
          "topic": "Quadratic Equations",
          "solution": "D = b^2 - 4ac = 16 - 24 = -8",
          "required_calculation": "D = (-4)^2 - 4(2)(3)"
        }
      ]
    }
    """
    config = QuestionConfiguration(
        class_name="Grade 10",
        subject="Mathematics",
        maximum_marks=4,
        topics=["Quadratic Equations"],
        type_configs=[
            QuestionTypeConfig(
                question_type=QuestionType.NUMERIC,
                enabled=True,
                count=1,
                marks_per_question=4,
                difficulty=DifficultyLevel.MODERATE,
            )
        ],
    )
    gen_initial = QuestionGeneratorService(MockLLMService(initial_json))
    questions, _ = gen_initial.generate_all_questions(config)

    gen_replace = QuestionGeneratorService(MockLLMService(replacement_json))
    updated, val = gen_replace.regenerate_single_question(config, questions, "Q001")
    assert len(updated) == 1
    assert "discriminant" in updated[0].question
    assert val.is_valid is True
