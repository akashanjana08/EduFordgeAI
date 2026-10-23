"""Template management, predefined layouts, and question-to-section mapping service."""
from __future__ import annotations

from typing import Any, Dict, List

from app.models.question import Question, QuestionType
from app.models.question_paper import QuestionPaper, QuestionSection, SchoolDetails
from app.models.template import (
    TemplateDefinition,
    TemplateFooterConfig,
    TemplateHeaderConfig,
    TemplateMetadataConfig,
    TemplateSectionRule,
)


PREDEFINED_TEMPLATES: Dict[str, TemplateDefinition] = {
    "template_1_simple": TemplateDefinition(
        template_id="template_1_simple",
        template_name="Template 1 - Simple School Format",
        description="Clean single-column traditional school examination paper with centered header and standard sections.",
        header=TemplateHeaderConfig(logo_position="left", border_style="single"),
        metadata=TemplateMetadataConfig(layout_columns=2),
        sections=[
            TemplateSectionRule(
                name="Section A",
                subtitle="Objective & Multiple Choice Questions",
                question_types=["mcq"],
            ),
            TemplateSectionRule(
                name="Section B",
                subtitle="Short & Numerical Questions",
                question_types=["subjective", "numeric"],
            ),
            TemplateSectionRule(
                name="Section C",
                subtitle="Analytical, Diagram & Application Questions",
                question_types=["diagram", "derivation", "application"],
            ),
        ],
    ),
    "template_2_modern": TemplateDefinition(
        template_id="template_2_modern",
        template_name="Template 2 - Modern School Format",
        description="Contemporary academic layout with structured metadata grid, crisp section banners, and modern typography.",
        header=TemplateHeaderConfig(logo_position="left", border_style="modern_accent"),
        metadata=TemplateMetadataConfig(layout_columns=4),
        sections=[
            TemplateSectionRule(
                name="Part I — Multiple Choice",
                subtitle="Select the most appropriate option",
                question_types=["mcq"],
            ),
            TemplateSectionRule(
                name="Part II — Conceptual & Numeric",
                subtitle="Show complete working where applicable",
                question_types=["subjective", "numeric", "diagram"],
            ),
            TemplateSectionRule(
                name="Part III — Derivations & Real-World Applications",
                subtitle="Extended response and case-based problems",
                question_types=["derivation", "application"],
            ),
        ],
    ),
    "template_3_cbse": TemplateDefinition(
        template_id="template_3_cbse",
        template_name="Template 3 - CBSE Style",
        description="Standardized Board Examination format with General Instructions box and Sections A through E.",
        header=TemplateHeaderConfig(logo_position="center", border_style="double"),
        metadata=TemplateMetadataConfig(layout_columns=2),
        instructions=[
            "This question paper contains 5 sections: Section A, B, C, D, and E.",
            "All questions are compulsory. Internal choices may be provided in select sections.",
            "Section A comprises Multiple Choice Questions (MCQs) carrying 1 mark each.",
            "Section B & C comprise Short Answer and Numerical questions.",
            "Section D & E comprise Long Answer, Derivation, Diagram, and Case/Application-based questions.",
            "Use of calculators is strictly prohibited. Draw neat diagrams wherever required.",
        ],
        sections=[
            TemplateSectionRule(
                name="SECTION A",
                subtitle="Multiple Choice Questions",
                question_types=["mcq"],
            ),
            TemplateSectionRule(
                name="SECTION B",
                subtitle="Short Answer & Numeric Questions",
                question_types=["numeric"],
            ),
            TemplateSectionRule(
                name="SECTION C",
                subtitle="Subjective & Descriptive Questions",
                question_types=["subjective"],
            ),
            TemplateSectionRule(
                name="SECTION D",
                subtitle="Derivations & Diagram-Based Questions",
                question_types=["derivation", "diagram"],
            ),
            TemplateSectionRule(
                name="SECTION E",
                subtitle="Case Study / Application-Based Questions",
                question_types=["application"],
            ),
        ],
    ),
    "template_4_compact": TemplateDefinition(
        template_id="template_4_compact",
        template_name="Template 4 - Compact Format",
        description="Space-saving high-density format designed to minimize paper usage for unit tests and weekly assessments.",
        compact_spacing=True,
        header=TemplateHeaderConfig(
            logo_position="left",
            show_address=False,
            border_style="minimal",
        ),
        metadata=TemplateMetadataConfig(layout_columns=4, show_date=False),
        instructions=[
            "Attempt all questions neatly. Marks are indicated in brackets.",
        ],
        sections=[
            TemplateSectionRule(
                name="Section I — Objective",
                subtitle="Direct response questions",
                question_types=["mcq", "numeric"],
            ),
            TemplateSectionRule(
                name="Section II — Descriptive & Applied",
                subtitle="Structured analytical questions",
                question_types=["subjective", "diagram", "derivation", "application"],
            ),
        ],
    ),
    "template_5_header_section": TemplateDefinition(
        template_id="template_5_header_section",
        template_name="Template 5 - Header + Section Based",
        description="Dedicated section per question type with explicit section-level marking rubrics and instructions.",
        header=TemplateHeaderConfig(logo_position="left", border_style="double"),
        metadata=TemplateMetadataConfig(layout_columns=2),
        sections=[
            TemplateSectionRule(
                name="Section A: Multiple Choice",
                subtitle="Choose the single correct option for each question",
                question_types=["mcq"],
            ),
            TemplateSectionRule(
                name="Section B: Subjective Theory",
                subtitle="Answer in clear, well-structured sentences",
                question_types=["subjective"],
            ),
            TemplateSectionRule(
                name="Section C: Numerical Problems",
                subtitle="State formulas clearly and include units",
                question_types=["numeric"],
            ),
            TemplateSectionRule(
                name="Section D: Diagrams & Derivations",
                subtitle="Provide labeled illustrations and formal proofs",
                question_types=["diagram", "derivation"],
            ),
            TemplateSectionRule(
                name="Section E: Real-World Applications",
                subtitle="Analyze the scenario and apply core concepts",
                question_types=["application"],
            ),
        ],
    ),
    "template_6_two_column": TemplateDefinition(
        template_id="template_6_two_column",
        template_name="Template 6 - Two Column Format",
        description="Two-column competitive exam style layout ideal for dense MCQ and mixed examination papers.",
        two_column_questions=True,
        compact_spacing=True,
        header=TemplateHeaderConfig(logo_position="left", border_style="double"),
        metadata=TemplateMetadataConfig(layout_columns=4),
        sections=[
            TemplateSectionRule(
                name="SECTION I — OBJECTIVE & QUANTITATIVE",
                subtitle="Multiple Choice & Numerical Evaluation",
                question_types=["mcq", "numeric"],
            ),
            TemplateSectionRule(
                name="SECTION II — ANALYTICAL & STRUCTURED",
                subtitle="Subjective, Diagram, Derivation & Application",
                question_types=["subjective", "diagram", "derivation", "application"],
            ),
        ],
        footer=TemplateFooterConfig(show_page_numbers=True, footer_note="Continue to Next Column / Page"),
    ),
}


class QuestionPaperTemplate:
    """Template abstraction capable of rendering headers, sections, questions, and footers."""

    def __init__(self, definition: TemplateDefinition) -> None:
        self.definition = definition

    def render_header(self, school: SchoolDetails, paper: QuestionPaper) -> Dict[str, Any]:
        """Return structured header context for preview and PDF rendering."""
        return {
            "school_name": (
                school.school_name.upper()
                if self.definition.header.uppercase_title
                else school.school_name
            ),
            "school_address": school.school_address if self.definition.header.show_address else "",
            "exam_name": school.exam_name if self.definition.header.show_exam_name else "",
            "academic_session": school.academic_session,
            "term": school.term,
            "class_name": paper.class_name,
            "subject": paper.subject,
            "maximum_marks": paper.maximum_marks,
            "time_duration": school.time_duration,
            "exam_date": school.exam_date,
            "instructions": self.definition.instructions,
        }

    def render_section(self, section: QuestionSection) -> Dict[str, Any]:
        """Return structured section metadata including calculated marks breakdown."""
        return {
            "name": section.name,
            "subtitle": section.subtitle,
            "instructions": section.instructions,
            "question_count": section.question_count,
            "section_marks": section.section_marks,
            "marks_summary": section.marks_summary_label,
        }

    def render_question(self, question: Question, index: int) -> Dict[str, Any]:
        """Return student-safe question representation (strictly excluding correct_answer and solution)."""
        return {
            "number": index,
            "id": question.id,
            "type": question.type.value,
            "question": question.question,
            "options": question.options if question.type == QuestionType.MCQ else None,
            "marks": question.marks,
            "diagram_description": question.diagram_description,
            "topic": question.topic,
        }

    def render_footer(self, page_number: int, total_pages: int) -> Dict[str, Any]:
        """Return footer representation."""
        return {
            "footer_note": self.definition.footer.footer_note,
            "page_label": (
                f"Page {page_number} of {total_pages}"
                if self.definition.footer.show_page_numbers
                else ""
            ),
        }


class TemplateService:
    """Manages predefined templates and maps generated questions into template sections."""

    @staticmethod
    def list_predefined_templates() -> List[TemplateDefinition]:
        return list(PREDEFINED_TEMPLATES.values())

    @staticmethod
    def get_template(template_id: str) -> TemplateDefinition:
        return PREDEFINED_TEMPLATES.get(
            template_id, PREDEFINED_TEMPLATES["template_3_cbse"]
        )

    @staticmethod
    def map_questions_to_template(
        questions: List[Question],
        template: TemplateDefinition,
    ) -> List[QuestionSection]:
        """
        Automatically map generated questions into the sections defined by the selected
        or uploaded template. Any unmapped questions are placed in a fallback section
        so zero questions are ever lost.
        """
        assigned_ids = set()
        sections: List[QuestionSection] = []

        for rule in template.sections:
            rule_types = {t.lower() for t in rule.question_types}
            matched: List[Question] = []
            for q in questions:
                if q.id in assigned_ids:
                    continue
                if q.type.value.lower() in rule_types:
                    if rule.marks_per_question is not None and q.marks != rule.marks_per_question:
                        continue
                    q.section_name = rule.name
                    matched.append(q)
                    assigned_ids.add(q.id)

            if matched:
                sections.append(
                    QuestionSection(
                        name=rule.name,
                        subtitle=rule.subtitle,
                        instructions=rule.instructions,
                        questions=matched,
                    )
                )

        # Fallback for any questions whose types weren't explicitly listed in a custom template
        remaining = [q for q in questions if q.id not in assigned_ids]
        if remaining:
            fallback_name = f"Section {chr(65 + len(sections))}"
            for q in remaining:
                q.section_name = fallback_name
            sections.append(
                QuestionSection(
                    name=fallback_name,
                    subtitle="Additional Questions",
                    questions=remaining,
                )
            )

        return sections
