"""Pydantic models for predefined and uploaded question-paper templates."""
from __future__ import annotations

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class TemplateHeaderConfig(BaseModel):
    """Header layout flags for a question-paper template."""

    show_logo: bool = True
    logo_position: str = Field(default="left")  # left, center, top
    show_school_name: bool = True
    show_address: bool = True
    show_exam_name: bool = True
    show_session_and_term: bool = True
    uppercase_title: bool = True
    border_style: str = Field(default="double")  # single, double, modern_accent, minimal


class TemplateMetadataConfig(BaseModel):
    """Metadata bar layout flags."""

    show_class: bool = True
    show_subject: bool = True
    show_maximum_marks: bool = True
    show_duration: bool = True
    show_date: bool = True
    layout_columns: int = Field(default=2, ge=1, le=4)


class TemplateSectionRule(BaseModel):
    """Defines a section within a template and which question types map into it."""

    name: str = Field(..., description="e.g., Section A")
    subtitle: str = Field(default="")
    question_types: List[str] = Field(default_factory=list)
    marks_per_question: Optional[int] = None
    expected_count: Optional[int] = None
    instructions: Optional[str] = None


class TemplateFooterConfig(BaseModel):
    """Footer configuration for the printable PDF."""

    show_page_numbers: bool = True
    footer_note: str = Field(default="All the Best")
    show_school_watermark: bool = False


class TemplateDefinition(BaseModel):
    """Complete structural definition of a predefined or extracted custom template."""

    template_id: str
    template_name: str
    description: str = Field(default="")
    page_size: str = Field(default="A4")
    two_column_questions: bool = Field(default=False)
    compact_spacing: bool = Field(default=False)
    header: TemplateHeaderConfig = Field(default_factory=TemplateHeaderConfig)
    metadata: TemplateMetadataConfig = Field(default_factory=TemplateMetadataConfig)
    instructions: List[str] = Field(
        default_factory=lambda: [
            "All questions are compulsory.",
            "Marks for each question are indicated against it on the right margin.",
            "Show all necessary calculation steps clearly wherever applicable.",
            "Write neat and legible answers; draw labeled diagrams wherever required.",
        ]
    )
    sections: List[TemplateSectionRule] = Field(default_factory=list)
    question_patterns: List[Dict[str, object]] = Field(default_factory=list)
    footer: TemplateFooterConfig = Field(default_factory=TemplateFooterConfig)
    is_custom_uploaded: bool = Field(default=False)
