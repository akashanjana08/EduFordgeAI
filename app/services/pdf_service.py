"""Printable A4 PDF generation service using ReportLab for Question Papers and Answer Keys."""
from __future__ import annotations

import io
from html import escape
from typing import List

from reportlab.graphics.shapes import Circle, Drawing, Line, Polygon, Rect, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    Image as RLImage,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.models.question import QuestionType
from app.models.question_paper import QuestionPaper


class NumberedA4Canvas(canvas.Canvas):
    """Custom ReportLab canvas that renders page numbers and footer notes on every page."""

    def __init__(self, *args, footer_note: str = "All the Best", show_page_numbers: bool = True, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []
        self._footer_note = footer_note
        self._show_page_numbers = show_page_numbers

    def showPage(self) -> None:
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self) -> None:
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._draw_footer(num_pages)
            super().showPage()
        super().save()

    def _draw_footer(self, page_count: int) -> None:
        self.saveState()
        self.setFont("Helvetica", 8.5)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        width, _ = A4
        self.line(15 * mm, 14 * mm, width - 15 * mm, 14 * mm)
        if self._footer_note:
            self.setFillColor(colors.HexColor("#475569"))
            self.drawString(15 * mm, 9.5 * mm, self._footer_note)
        if self._show_page_numbers:
            self.setFillColor(colors.HexColor("#334155"))
            self.drawRightString(
                width - 15 * mm, 9.5 * mm, f"Page {self._pageNumber} of {page_count}"
            )
        self.restoreState()


class PDFService:
    """Generates printable A4 PDFs for Student Question Papers and separate Teacher Answer Keys."""

    @classmethod
    def generate_question_paper_pdf(cls, paper: QuestionPaper) -> bytes:
        """
        Generate the final student question paper PDF.
        Enforces strict marks validation before generating and guarantees no answers leak.
        """
        if paper.total_marks != paper.maximum_marks:
            raise ValueError(
                f"Cannot generate PDF: Total marks of questions ({paper.total_marks}) "
                f"does not match Maximum Marks ({paper.maximum_marks})."
            )

        buffer = io.BytesIO()
        compact = paper.template.compact_spacing
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=15 * mm,
            rightMargin=15 * mm,
            topMargin=14 * mm,
            bottomMargin=20 * mm,
            title=f"{paper.school_details.school_name} - {paper.subject} Question Paper",
        )

        styles = cls._build_styles(compact=compact)
        story: List[object] = []

        # 1. School Header & Logo
        story.extend(cls._build_header_flowables(paper, styles))

        # 2. General Instructions
        if paper.template.instructions:
            story.append(Paragraph("<b>General Instructions:</b>", styles["SectionSubhead"]))
            for idx, inst in enumerate(paper.template.instructions, start=1):
                story.append(
                    Paragraph(f"{idx}. {escape(inst)}", styles["InstructionItem"])
                )
            story.append(Spacer(1, 3 * mm))
            story.append(
                HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#334155"))
            )
            story.append(Spacer(1, 3 * mm))

        # 3. Sections & Questions (Wrapped in KeepTogether to prevent splitting across pages)
        q_counter = 1
        usable_width = A4[0] - 30 * mm
        for section in paper.sections:
            sec_header = Table(
                [
                    [
                        Paragraph(f"<b>{escape(section.name)}</b>", styles["SectionTitle"]),
                        Paragraph(
                            f"<b>{escape(section.marks_summary_label)}</b>",
                            styles["SectionMarksRight"],
                        ),
                    ]
                ],
                colWidths=[usable_width * 0.72, usable_width * 0.28],
            )
            sec_header.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
                        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                        ("LEFTPADDING", (0, 0), (-1, -1), 6),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                        ("TOPPADDING", (0, 0), (-1, -1), 4),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ]
                )
            )
            story.append(sec_header)
            if section.subtitle:
                story.append(
                    Paragraph(f"<i>{escape(section.subtitle)}</i>", styles["SectionSubtitle"])
                )
            story.append(Spacer(1, 2 * mm))

            for q in section.questions:
                q_block: List[object] = []
                q_text_html = f"<b>Q{q_counter}.</b> {escape(q.question)}"
                marks_html = f"<b>[{q.marks}]</b>"
                q_row = Table(
                    [
                        [
                            Paragraph(q_text_html, styles["QuestionStem"]),
                            Paragraph(marks_html, styles["MarksRight"]),
                        ]
                    ],
                    colWidths=[usable_width - 18 * mm, 18 * mm],
                )
                q_row.setStyle(
                    TableStyle(
                        [
                            ("VALIGN", (0, 0), (-1, -1), "TOP"),
                            ("LEFTPADDING", (0, 0), (-1, -1), 0),
                            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                            ("TOPPADDING", (0, 0), (-1, -1), 1),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                        ]
                    )
                )
                q_block.append(q_row)

                # Drawn vector figure if diagram question
                if q.type == QuestionType.DIAGRAM:
                    q_block.append(Spacer(1, 1.5 * mm))
                    q_block.append(cls._build_diagram_drawing(q, q_counter))

                # MCQ Options (student-safe: no answer highlighted)
                if q.type == QuestionType.MCQ and q.options:
                    option_labels = ["A", "B", "C", "D", "E", "F"]
                    for opt_idx, opt_val in enumerate(q.options):
                        letter = option_labels[opt_idx] if opt_idx < len(option_labels) else str(opt_idx + 1)
                        cleaned_opt = opt_val.strip()
                        if cleaned_opt.startswith(f"{letter}.") or cleaned_opt.startswith(f"({letter})"):
                            opt_line = escape(cleaned_opt)
                        else:
                            opt_line = f"<b>{letter}.</b> {escape(cleaned_opt)}"
                        q_block.append(Paragraph(opt_line, styles["OptionItem"]))

                q_block.append(Spacer(1, 2.5 * mm if not compact else 1.5 * mm))
                story.append(KeepTogether(q_block))
                q_counter += 1

            story.append(Spacer(1, 3 * mm))

        doc.build(
            story,
            canvasmaker=lambda *args, **kwargs: NumberedA4Canvas(
                *args,
                footer_note=paper.template.footer.footer_note,
                show_page_numbers=paper.template.footer.show_page_numbers,
                **kwargs,
            ),
        )
        return buffer.getvalue()

    @classmethod
    def generate_answer_key_pdf(cls, paper: QuestionPaper) -> bytes:
        """Generate a separate confidential Answer Key & Marking Scheme PDF."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=15 * mm,
            rightMargin=15 * mm,
            topMargin=14 * mm,
            bottomMargin=20 * mm,
            title=f"{paper.school_details.school_name} - {paper.subject} Answer Key",
        )
        styles = cls._build_styles(compact=False)
        story: List[object] = []

        header_lines = [
            Paragraph(
                f"<b>{escape(paper.school_details.school_name.upper())}</b>",
                styles["SchoolTitle"],
            ),
            Paragraph(
                f"<b>CONFIDENTIAL ANSWER KEY &amp; MARKING SCHEME — {escape(paper.subject.upper())} ({escape(paper.class_name)})</b>",
                styles["ExamTitle"],
            ),
        ]
        if paper.school_details.logo_bytes and paper.template.header.show_logo:
            try:
                usable_width = A4[0] - 30 * mm
                logo_img = RLImage(
                    io.BytesIO(paper.school_details.logo_bytes),
                    width=18 * mm,
                    height=18 * mm,
                )
                header_table = Table(
                    [[logo_img, header_lines]],
                    colWidths=[22 * mm, usable_width - 22 * mm],
                )
                header_table.setStyle(
                    TableStyle(
                        [
                            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                            ("LEFTPADDING", (0, 0), (-1, -1), 0),
                            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                        ]
                    )
                )
                story.append(header_table)
            except Exception:
                story.extend(header_lines)
        else:
            story.extend(header_lines)
        story.append(Spacer(1, 3 * mm))
        story.append(HRFlowable(width="100%", thickness=1.0, color=colors.HexColor("#0F172A")))
        story.append(Spacer(1, 4 * mm))

        q_counter = 1
        for section in paper.sections:
            story.append(Paragraph(f"<b>{escape(section.name)}</b>", styles["SectionTitle"]))
            story.append(Spacer(1, 2 * mm))
            for q in section.questions:
                ans = escape(q.correct_answer or "See detailed marking scheme below.")
                sol = escape(q.solution or q.required_calculation or "Award full marks for complete logical steps.")
                block = [
                    Paragraph(
                        f"<b>Q{q_counter}. [{q.marks} Mark(s)] — Topic: {escape(q.topic)}</b>",
                        styles["QuestionStem"],
                    ),
                    Paragraph(f"<b>Correct Answer:</b> {ans}", styles["OptionItem"]),
                    Paragraph(f"<b>Solution / Marking Scheme:</b> {sol}", styles["OptionItem"]),
                    Spacer(1, 2.5 * mm),
                ]
                story.append(KeepTogether(block))
                q_counter += 1

        doc.build(
            story,
            canvasmaker=lambda *args, **kwargs: NumberedA4Canvas(
                *args,
                footer_note="CONFIDENTIAL — FOR EXAMINER USE ONLY",
                show_page_numbers=True,
                **kwargs,
            ),
        )
        return buffer.getvalue()

    @classmethod
    def _build_header_flowables(
        cls, paper: QuestionPaper, styles: dict
    ) -> List[object]:
        flowables: List[object] = []
        school = paper.school_details
        usable_width = A4[0] - 30 * mm

        title_text = (
            school.school_name.upper()
            if paper.template.header.uppercase_title
            else school.school_name
        )
        header_lines = [Paragraph(f"<b>{escape(title_text)}</b>", styles["SchoolTitle"])]
        if school.school_address and paper.template.header.show_address:
            header_lines.append(Paragraph(escape(school.school_address), styles["SchoolAddress"]))

        exam_parts = [p for p in (school.exam_name, school.term, school.academic_session) if p]
        if exam_parts:
            header_lines.append(
                Paragraph(f"<b>{escape(' — '.join(exam_parts))}</b>", styles["ExamTitle"])
            )

        if school.logo_bytes and paper.template.header.show_logo:
            try:
                logo_img = RLImage(io.BytesIO(school.logo_bytes), width=20 * mm, height=20 * mm)
                header_table = Table(
                    [[logo_img, header_lines]],
                    colWidths=[24 * mm, usable_width - 24 * mm],
                )
                header_table.setStyle(
                    TableStyle(
                        [
                            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                            ("LEFTPADDING", (0, 0), (-1, -1), 0),
                            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                        ]
                    )
                )
                flowables.append(header_table)
            except Exception:
                flowables.extend(header_lines)
        else:
            flowables.extend(header_lines)

        flowables.append(Spacer(1, 2.5 * mm))
        flowables.append(HRFlowable(width="100%", thickness=1.2, color=colors.HexColor("#0F172A")))
        flowables.append(Spacer(1, 2 * mm))

        meta_rows = [
            [
                Paragraph(f"<b>Class:</b> {escape(paper.class_name)}", styles["MetaLeft"]),
                Paragraph(f"<b>Subject:</b> {escape(paper.subject)}", styles["MetaRight"]),
            ],
            [
                Paragraph(
                    f"<b>Time:</b> {escape(school.time_duration or '3 Hours')}",
                    styles["MetaLeft"],
                ),
                Paragraph(
                    f"<b>Maximum Marks:</b> {paper.maximum_marks}",
                    styles["MetaRight"],
                ),
            ],
        ]
        if school.exam_date and paper.template.metadata.show_date:
            meta_rows.append(
                [
                    Paragraph(f"<b>Date:</b> {escape(school.exam_date)}", styles["MetaLeft"]),
                    Paragraph("", styles["MetaRight"]),
                ]
            )

        meta_table = Table(meta_rows, colWidths=[usable_width * 0.5, usable_width * 0.5])
        meta_table.setStyle(
            TableStyle(
                [
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 1.5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
                ]
            )
        )
        flowables.append(meta_table)
        flowables.append(Spacer(1, 2 * mm))
        flowables.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#334155")))
        flowables.append(Spacer(1, 3 * mm))
        return flowables

    @staticmethod
    def _build_styles(compact: bool = False) -> dict:
        base = getSampleStyleSheet()
        font_size = 9.5 if compact else 10.5
        leading = 12.5 if compact else 14.5
        return {
            "SchoolTitle": ParagraphStyle(
                "SchoolTitle",
                parent=base["Heading1"],
                fontName="Helvetica-Bold",
                fontSize=15,
                leading=18,
                alignment=TA_CENTER,
                textColor=colors.HexColor("#0F172A"),
                spaceAfter=2,
            ),
            "SchoolAddress": ParagraphStyle(
                "SchoolAddress",
                parent=base["Normal"],
                fontName="Helvetica",
                fontSize=9,
                leading=11,
                alignment=TA_CENTER,
                textColor=colors.HexColor("#475569"),
                spaceAfter=3,
            ),
            "ExamTitle": ParagraphStyle(
                "ExamTitle",
                parent=base["Heading2"],
                fontName="Helvetica-Bold",
                fontSize=11.5,
                leading=14,
                alignment=TA_CENTER,
                textColor=colors.HexColor("#1E293B"),
                spaceAfter=2,
            ),
            "MetaLeft": ParagraphStyle(
                "MetaLeft",
                parent=base["Normal"],
                fontName="Helvetica",
                fontSize=10,
                leading=13,
                alignment=TA_LEFT,
            ),
            "MetaRight": ParagraphStyle(
                "MetaRight",
                parent=base["Normal"],
                fontName="Helvetica",
                fontSize=10,
                leading=13,
                alignment=TA_RIGHT,
            ),
            "SectionSubhead": ParagraphStyle(
                "SectionSubhead",
                parent=base["Normal"],
                fontName="Helvetica-Bold",
                fontSize=10,
                leading=13,
                spaceAfter=2,
            ),
            "InstructionItem": ParagraphStyle(
                "InstructionItem",
                parent=base["Normal"],
                fontName="Helvetica",
                fontSize=9,
                leading=12,
                leftIndent=8,
            ),
            "SectionTitle": ParagraphStyle(
                "SectionTitle",
                parent=base["Heading3"],
                fontName="Helvetica-Bold",
                fontSize=10.5,
                leading=13,
                alignment=TA_LEFT,
                textColor=colors.HexColor("#0F172A"),
            ),
            "SectionMarksRight": ParagraphStyle(
                "SectionMarksRight",
                parent=base["Normal"],
                fontName="Helvetica-Bold",
                fontSize=9.5,
                leading=12,
                alignment=TA_RIGHT,
                textColor=colors.HexColor("#334155"),
            ),
            "SectionSubtitle": ParagraphStyle(
                "SectionSubtitle",
                parent=base["Normal"],
                fontName="Helvetica-Oblique",
                fontSize=9,
                leading=12,
                textColor=colors.HexColor("#475569"),
                spaceBefore=2,
            ),
            "QuestionStem": ParagraphStyle(
                "QuestionStem",
                parent=base["Normal"],
                fontName="Helvetica",
                fontSize=font_size,
                leading=leading,
                alignment=TA_LEFT,
                textColor=colors.HexColor("#0F172A"),
            ),
            "MarksRight": ParagraphStyle(
                "MarksRight",
                parent=base["Normal"],
                fontName="Helvetica-Bold",
                fontSize=font_size,
                leading=leading,
                alignment=TA_RIGHT,
                textColor=colors.HexColor("#0F172A"),
            ),
            "OptionItem": ParagraphStyle(
                "OptionItem",
                parent=base["Normal"],
                fontName="Helvetica",
                fontSize=font_size - 0.5,
                leading=leading - 1,
                leftIndent=14,
                textColor=colors.HexColor("#1E293B"),
            ),
            "DiagramBox": ParagraphStyle(
                "DiagramBox",
                parent=base["Normal"],
                fontName="Helvetica",
                fontSize=9,
                leading=12,
                textColor=colors.HexColor("#334155"),
            ),
        }
