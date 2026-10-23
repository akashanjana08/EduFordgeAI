"""Pydantic models for School Details, Question Sections, Question Paper, and Validation Results."""
from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field

from app.models.question import Question
from app.models.template import TemplateDefinition


class SchoolDetails(BaseModel):
    """School / institution branding metadata."""

    school_name: str = Field(default="ABC International School", min_length=2)
    school_address: Optional[str] = Field(default="Sector 14, Knowledge Park, New Delhi")
    academic_session: Optional[str] = Field(default="2026–2027")
    exam_name: Optional[str] = Field(default="Annual Examination")
    term: Optional[str] = Field(default="Term II")
    exam_date: Optional[str] = Field(default="2026-10-15")
    time_duration: Optional[str] = Field(default="3 Hours")
    logo_bytes: Optional[bytes] = Field(default=None, exclude=True)
    logo_mime_type: Optional[str] = Field(default=None)
    logo_filename: Optional[str] = Field(default=None)


class QuestionSection(BaseModel):
    """A mapped section in the final question paper."""

    name: str
    subtitle: str = Field(default="")
    instructions: Optional[str] = None
    questions: List[Question] = Field(default_factory=list)

    @property
    def section_marks(self) -> int:
        return sum(q.marks for q in self.questions)

    @property
    def question_count(self) -> int:
        return len(self.questions)

    @property
    def marks_summary_label(self) -> str:
        if not self.questions:
            return "0 Marks"
        unique_marks = {q.marks for q in self.questions}
        if len(unique_marks) == 1:
            m = next(iter(unique_marks))
            return f"{len(self.questions)} × {m} = {self.section_marks}"
        return f"Total Marks: {self.section_marks}"


class ValidationCheckItem(BaseModel):
    """Single validation check outcome."""

    key: str
    label: str
    passed: bool
    message: str


class ValidationResult(BaseModel):
    """Comprehensive validation report for a generated question paper."""

    is_valid: bool
    count_validated: bool
    marks_validated: bool
    difficulty_validated: bool
    question_types_validated: bool
    no_duplicates_detected: bool
    mcq_validated: bool
    numeric_validated: bool
    expected_questions: int
    actual_questions: int
    expected_marks: int
    actual_marks: int
    duplicate_pairs: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    checks: List[ValidationCheckItem] = Field(default_factory=list)


class QuestionPaper(BaseModel):
    """Complete assembled question paper ready for preview and PDF generation."""

    school_details: SchoolDetails
    class_name: str
    subject: str
    maximum_marks: int
    topics: List[str]
    template: TemplateDefinition
    sections: List[QuestionSection]
    validation: Optional[ValidationResult] = None

    @property
    def all_questions(self) -> List[Question]:
        result: List[Question] = []
        for section in self.sections:
            result.extend(section.questions)
        return result

    @property
    def total_marks(self) -> int:
        return sum(q.marks for q in self.all_questions)

    @property
    def total_questions(self) -> int:
        return len(self.all_questions)
