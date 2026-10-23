"""Unit tests for PDF generation service (Student Paper and Answer Key)."""
from __future__ import annotations

import pytest

from app.models.question import Question, QuestionType
from app.models.question_paper import QuestionPaper, QuestionSection, SchoolDetails
from app.services.pdf_service import PDFService
from app.services.template_service import TemplateService


def test_pdf_generation_and_answer_key_isolation() -> None:
    template = TemplateService.get_template("template_3_cbse")
    q1 = Question(
        id="Q001",
        type=QuestionType.MCQ,
        question="What is the SI unit of electric current?",
        options=["Volt", "Ampere", "Ohm", "Watt"],
        correct_answer="Ampere",
        solution="Electric current is measured in Amperes (A).",
        marks=1,
        difficulty="Easy",
        topic="Electricity",
    )
    paper = QuestionPaper(
        school_details=SchoolDetails(school_name="ABC International School"),
        class_name="Grade 10",
        subject="Physics",
        maximum_marks=1,
        topics=["Electricity"],
        template=template,
        sections=[
            QuestionSection(name="SECTION A", subtitle="MCQs", questions=[q1])
        ],
    )

    student_pdf = PDFService.generate_question_paper_pdf(paper)
    assert student_pdf.startswith(b"%PDF-")
    assert len(student_pdf) > 500

    answer_key_pdf = PDFService.generate_answer_key_pdf(paper)
    assert answer_key_pdf.startswith(b"%PDF-")
    assert len(answer_key_pdf) > 500


def test_pdf_blocked_when_marks_mismatch() -> None:
    template = TemplateService.get_template("template_1_simple")
    q1 = Question(
        id="Q001",
        type=QuestionType.SUBJECTIVE,
        question="Define Ohm's law.",
        marks=2,
        difficulty="Easy",
        topic="Electricity",
    )
    paper = QuestionPaper(
        school_details=SchoolDetails(school_name="ABC International School"),
        class_name="Grade 10",
        subject="Physics",
        maximum_marks=80,  # Mismatch: actual is 2, maximum is 80
        topics=["Electricity"],
        template=template,
        sections=[QuestionSection(name="Section A", questions=[q1])],
    )
    with pytest.raises(ValueError, match="Cannot generate PDF"):
        PDFService.generate_question_paper_pdf(paper)
