"""Unit tests for template extraction and question-to-template mapping."""
from __future__ import annotations

from app.models.question import Question, QuestionType
from app.services.document_parser import DocumentParserService
from app.services.template_service import TemplateService


def test_extract_structure_from_sample_paper_text() -> None:
    sample_text = """
    ABC International School
    Class: X
    Subject: Mathematics
    Time: 3 Hours
    Maximum Marks: 80

    General Instructions
    1. All questions are compulsory.
    2. Use of calculator is not permitted.

    Section A
    20 MCQs x 1 mark

    Section B
    5 Short Answer Questions x 2 marks

    Section C
    5 Long Answer Questions x 4 marks
    """
    extracted = DocumentParserService.extract_structure_from_text(
        sample_text, source_name="Sample_Math_Paper"
    )
    assert extracted.is_custom_uploaded is True
    assert len(extracted.sections) >= 3
    assert extracted.sections[0].name == "SECTION A"
    assert len(extracted.instructions) >= 2
    assert len(extracted.question_patterns) == 3


def test_template_mapping_preserves_all_questions() -> None:
    template = TemplateService.get_template("template_3_cbse")
    questions = [
        Question(
            id="Q001",
            type=QuestionType.MCQ,
            question="Value of sin(90 deg) is?",
            options=["0", "1", "-1", "0.5"],
            correct_answer="1",
            marks=1,
            difficulty="Easy",
            topic="Trigonometry",
        ),
        Question(
            id="Q002",
            type=QuestionType.APPLICATION,
            question="A lighthouse of height 60m observes a ship at an angle of depression 30 deg. Find distance.",
            correct_answer="60*sqrt(3) m",
            marks=5,
            difficulty="Difficult",
            topic="Trigonometry",
        ),
    ]
    sections = TemplateService.map_questions_to_template(questions, template)
    mapped_total = sum(len(s.questions) for s in sections)
    assert mapped_total == 2
