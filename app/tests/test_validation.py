"""Unit tests for ValidationService covering marks, counts, difficulty, MCQ, and duplicates."""
from __future__ import annotations

import pytest

from app.models.question import (
    DifficultyLevel,
    MixedDifficultyDistribution,
    Question,
    QuestionConfiguration,
    QuestionType,
    QuestionTypeConfig,
)
from app.services.validation_service import ValidationService


def test_marks_and_count_validation_100_marks() -> None:
    """Test the exact 100-marks scenario from specification section 37."""
    config = QuestionConfiguration(
        class_name="Grade 12",
        subject="Physics",
        maximum_marks=100,
        topics=["Electrostatics", "Optics", "Thermodynamics"],
        type_configs=[
            QuestionTypeConfig(question_type=QuestionType.MCQ, enabled=True, count=20, marks_per_question=1),
            QuestionTypeConfig(question_type=QuestionType.SUBJECTIVE, enabled=True, count=5, marks_per_question=4),
            QuestionTypeConfig(question_type=QuestionType.NUMERIC, enabled=True, count=5, marks_per_question=4),
            QuestionTypeConfig(question_type=QuestionType.DERIVATION, enabled=True, count=2, marks_per_question=10),
            QuestionTypeConfig(question_type=QuestionType.APPLICATION, enabled=True, count=2, marks_per_question=10),
        ],
    )
    assert config.configured_total_marks == 100
    assert config.configured_total_questions == 34

    questions = []
    idx = 1
    for i in range(20):
        questions.append(
            Question(
                id=f"Q{idx:03d}",
                type=QuestionType.MCQ,
                question=f"Unique Physics MCQ number {i + 1} about Electrostatics concept {i * 7}?",
                options=[f"A{i}", f"B{i}", f"C{i}", f"D{i}"],
                correct_answer=f"A{i}",
                marks=1,
                difficulty="Easy",
                topic="Electrostatics",
            )
        )
        idx += 1
    for i in range(5):
        questions.append(
            Question(
                id=f"Q{idx:03d}",
                type=QuestionType.SUBJECTIVE,
                question=f"Explain thermodynamic process principle variant {i + 1} in detail.",
                marks=4,
                difficulty="Moderate",
                topic="Thermodynamics",
            )
        )
        idx += 1
    for i in range(5):
        questions.append(
            Question(
                id=f"Q{idx:03d}",
                type=QuestionType.NUMERIC,
                question=f"Calculate focal length of lens system {i + 1} with refractive index {1.5 + i*0.1}.",
                correct_answer=f"{10 + i} cm",
                solution="1/f = (n-1)(1/R1 - 1/R2)",
                marks=4,
                difficulty="Moderate",
                topic="Optics",
            )
        )
        idx += 1
    for i in range(2):
        questions.append(
            Question(
                id=f"Q{idx:03d}",
                type=QuestionType.DERIVATION,
                question=f"Derive the electric field expression for configuration {i + 1} using Gauss law.",
                solution="Full integral derivation",
                marks=10,
                difficulty="Difficult",
                topic="Electrostatics",
            )
        )
        idx += 1
    for i in range(2):
        questions.append(
            Question(
                id=f"Q{idx:03d}",
                type=QuestionType.APPLICATION,
                question=f"Analyze optical fiber telecommunication loss scenario {i + 1} using total internal reflection.",
                solution="Critical angle analysis",
                marks=10,
                difficulty="Difficult",
                topic="Optics",
            )
        )
        idx += 1

    result = ValidationService.validate_paper(config, questions)
    assert result.is_valid is True
    assert result.count_validated is True
    assert result.marks_validated is True
    assert result.no_duplicates_detected is True


def test_duplicate_question_detection() -> None:
    q1 = Question(
        id="Q001",
        type=QuestionType.SUBJECTIVE,
        question="State and explain Newton's second law of motion with an example.",
        marks=3,
        difficulty="Easy",
        topic="Laws of Motion",
    )
    q2 = Question(
        id="Q002",
        type=QuestionType.SUBJECTIVE,
        question="State and explain Newtons second law of motion with an example!",
        marks=3,
        difficulty="Easy",
        topic="Laws of Motion",
    )
    dups = ValidationService.detect_duplicates([q1, q2])
    assert len(dups) == 1
    assert dups[0][0] == "Q001" and dups[0][1] == "Q002"


def test_mixed_difficulty_validation_error() -> None:
    with pytest.raises(ValueError):
        MixedDifficultyDistribution(easy_pct=40, moderate_pct=40, difficult_pct=10)
