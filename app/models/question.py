"""Pydantic models for questions, question types, and difficulty configuration."""
from __future__ import annotations

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, model_validator


class QuestionType(str, Enum):
    """Supported standardized question types."""

    MCQ = "mcq"
    SUBJECTIVE = "subjective"
    DIAGRAM = "diagram"
    NUMERIC = "numeric"
    DERIVATION = "derivation"
    APPLICATION = "application"


class SubjectiveSubtype(str, Enum):
    """Supported sub-variants for subjective questions."""

    SHORT_ANSWER = "short_answer"
    LONG_ANSWER = "long_answer"
    DESCRIPTIVE = "descriptive"


class DifficultyLevel(str, Enum):
    """Supported question difficulty levels."""

    EASY = "Easy"
    MODERATE = "Moderate"
    DIFFICULT = "Difficult"
    MIXED = "Mixed"


class MixedDifficultyDistribution(BaseModel):
    """Percentage breakdown when Mixed difficulty is selected."""

    easy_pct: int = Field(default=30, ge=0, le=100)
    moderate_pct: int = Field(default=50, ge=0, le=100)
    difficult_pct: int = Field(default=20, ge=0, le=100)

    @model_validator(mode="after")
    def check_total_100(self) -> "MixedDifficultyDistribution":
        total = self.easy_pct + self.moderate_pct + self.difficult_pct
        if total != 100:
            raise ValueError(f"Mixed difficulty percentages must sum to 100% (got {total}%).")
        return self


class QuestionTypeConfig(BaseModel):
    """Configuration for a single enabled question type."""

    question_type: QuestionType
    enabled: bool = Field(default=False)
    count: int = Field(default=5, ge=1, le=100)
    marks_per_question: int = Field(default=1, ge=1, le=50)
    difficulty: DifficultyLevel = Field(default=DifficultyLevel.MODERATE)
    num_options: int = Field(default=4, ge=2, le=6)
    subjective_subtype: Optional[SubjectiveSubtype] = Field(
        default=SubjectiveSubtype.SHORT_ANSWER
    )
    section_title: Optional[str] = None

    @property
    def total_marks(self) -> int:
        return self.count * self.marks_per_question if self.enabled else 0


class QuestionConfiguration(BaseModel):
    """Overall question paper generation configuration."""

    class_name: str = Field(..., min_length=1)
    subject: str = Field(..., min_length=1)
    maximum_marks: int = Field(..., ge=1, le=500)
    topics: List[str] = Field(..., min_length=1)
    allow_broad_syllabus: bool = Field(default=False)
    global_difficulty: DifficultyLevel = Field(default=DifficultyLevel.MIXED)
    mixed_distribution: MixedDifficultyDistribution = Field(
        default_factory=MixedDifficultyDistribution
    )
    type_configs: List[QuestionTypeConfig] = Field(default_factory=list)

    @property
    def enabled_configs(self) -> List[QuestionTypeConfig]:
        return [cfg for cfg in self.type_configs if cfg.enabled]

    @property
    def configured_total_marks(self) -> int:
        return sum(cfg.total_marks for cfg in self.enabled_configs)

    @property
    def configured_total_questions(self) -> int:
        return sum(cfg.count for cfg in self.enabled_configs)


class Question(BaseModel):
    """Canonical representation of a generated or manually authored question."""

    id: str = Field(..., min_length=1)
    type: QuestionType
    question: str = Field(..., min_length=5)
    options: Optional[List[str]] = Field(default=None)
    correct_answer: Optional[str] = Field(default=None)
    marks: int = Field(..., ge=1, le=100)
    difficulty: str = Field(default="Moderate")
    topic: str = Field(..., min_length=1)
    solution: Optional[str] = Field(default=None)
    diagram_description: Optional[str] = Field(default=None)
    required_calculation: Optional[str] = Field(default=None)
    subjective_subtype: Optional[str] = Field(default=None)
    section_name: Optional[str] = Field(default=None)

    @model_validator(mode="after")
    def validate_mcq_structure(self) -> "Question":
        if self.type == QuestionType.MCQ:
            if not self.options or len(self.options) < 2:
                raise ValueError(f"MCQ question {self.id} must include options.")
            if not self.correct_answer or not self.correct_answer.strip():
                raise ValueError(f"MCQ question {self.id} must specify a correct_answer.")
        return self


class QuestionBatchResponse(BaseModel):
    """Structured response envelope returned by the LLM."""

    questions: List[Question]
