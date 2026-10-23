"""Document parser service to extract structural template layouts from PDF, DOCX, or DOC files."""
from __future__ import annotations

import io
import re
from pathlib import Path
from typing import Any, Dict, List

from app.models.template import (
    TemplateDefinition,
    TemplateFooterConfig,
    TemplateHeaderConfig,
    TemplateMetadataConfig,
    TemplateSectionRule,
)
from app.utils.file_utils import FileValidationError, validate_template_upload
from app.utils.helpers import sanitize_untrusted_text


SECTION_HEADER_RE = re.compile(
    r"^\s*(SECTION\s+[A-Z0-9IVX]+|PART\s+[A-Z0-9IVX]+)\b[:\-\s]*(.*)$",
    re.IGNORECASE,
)
PATTERN_MARKS_RE = re.compile(
    r"(\d+)\s*(?:questions?|mcqs?|short\s+answer|long\s+answer|numeric|application|diagram|derivation).*?[x×*]\s*(\d+)\s*marks?",
    re.IGNORECASE,
)


class DocumentParserService:
    """
    Extracts structural layout information (Header, Metadata, Instructions, Sections,
    Question Patterns, Footer) from an uploaded PDF or Word document without copying raw questions.
    """

    @classmethod
    def parse_uploaded_template(
        cls, file_bytes: bytes, filename: str
    ) -> TemplateDefinition:
        safe_name, ext = validate_template_upload(file_bytes, filename)
        raw_text = cls._extract_text(file_bytes, ext)
        sanitized_text = sanitize_untrusted_text(raw_text, max_chars=15000)
        if not sanitized_text.strip():
            raise FileValidationError(
                "Could not extract readable text structure from the uploaded document."
            )
        return cls.extract_structure_from_text(sanitized_text, source_name=Path(safe_name).stem)

    @classmethod
    def _extract_text(cls, file_bytes: bytes, ext: str) -> str:
        if ext == ".pdf":
            return cls._extract_pdf_text(file_bytes)
        if ext in {".docx", ".doc"}:
            return cls._extract_docx_text(file_bytes)
        raise FileValidationError(f"Unsupported file extension: {ext}")

    @staticmethod
    def _extract_pdf_text(file_bytes: bytes) -> str:
        try:
            import fitz  # PyMuPDF

            doc = fitz.open(stream=file_bytes, filetype="pdf")
            pages_text: List[str] = []
            for page in doc:
                pages_text.append(page.get_text("text"))
            doc.close()
            return "\n".join(pages_text)
        except Exception as exc:
            raise FileValidationError(f"Malformed or unreadable PDF document: {exc}") from exc

    @staticmethod
    def _extract_docx_text(file_bytes: bytes) -> str:
        try:
            import docx

            document = docx.Document(io.BytesIO(file_bytes))
            lines = [p.text for p in document.paragraphs if p.text and p.text.strip()]
            for table in document.tables:
                for row in table.rows:
                    row_text = " | ".join(c.text.strip() for c in row.cells if c.text.strip())
                    if row_text:
                        lines.append(row_text)
            return "\n".join(lines)
        except Exception as exc:
            raise FileValidationError(
                f"Malformed or unreadable Word (.docx/.doc) document: {exc}"
            ) from exc

    @classmethod
    def extract_structure_from_text(
        cls, text: str, source_name: str = "Uploaded Template"
    ) -> TemplateDefinition:
        """
        Analyze lines of an uploaded question paper to build a structural
        TemplateDefinition JSON representation.
        """
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        lower_full = text.lower()

        # 1. Detect metadata presence
        has_class = bool(re.search(r"\b(class|grade|standard)\s*[:\-]", lower_full))
        has_subject = bool(re.search(r"\bsubject\s*[:\-]", lower_full))
        has_marks = bool(re.search(r"\b(maximum\s+marks|max\.?\s*marks|total\s+marks)\s*[:\-]", lower_full))
        has_time = bool(re.search(r"\b(time|duration)\s*[:\-]", lower_full))

        # 2. Extract General Instructions
        instructions: List[str] = []
        in_instructions = False
        for ln in lines:
            if re.search(r"^(general\s+)?instructions?\b", ln, re.IGNORECASE):
                in_instructions = True
                continue
            if in_instructions:
                if SECTION_HEADER_RE.match(ln) or re.match(r"^q\.?\s*1\b", ln, re.IGNORECASE):
                    break
                cleaned_inst = re.sub(r"^[\d\.\)\-\•\*]+\s*", "", ln).strip()
                if 8 <= len(cleaned_inst) <= 220 and len(instructions) < 8:
                    instructions.append(cleaned_inst)

        if not instructions:
            instructions = [
                "All questions are compulsory.",
                "Marks for each question are indicated on the right margin.",
                "Show all necessary calculation steps clearly.",
            ]

        # 3. Extract Sections and Question Patterns
        sections: List[TemplateSectionRule] = []
        question_patterns: List[Dict[str, Any]] = []
        current_section_name = ""
        current_subtitle = ""

        for ln in lines:
            sec_match = SECTION_HEADER_RE.match(ln)
            if sec_match:
                current_section_name = sec_match.group(1).upper().strip()
                current_subtitle = sec_match.group(2).strip()
                inferred_types = cls._infer_types_from_text(current_subtitle or ln)
                sections.append(
                    TemplateSectionRule(
                        name=current_section_name,
                        subtitle=current_subtitle or "Standard Section",
                        question_types=inferred_types,
                    )
                )
                continue

            pat_match = PATTERN_MARKS_RE.search(ln)
            if pat_match:
                q_count = int(pat_match.group(1))
                q_marks = int(pat_match.group(2))
                inferred = cls._infer_types_from_text(ln)
                question_patterns.append(
                    {
                        "section": current_section_name or f"Section {chr(65 + len(question_patterns))}",
                        "count": q_count,
                        "marks_per_question": q_marks,
                        "question_types": inferred,
                        "raw_pattern": ln[:120],
                    }
                )
                if sections:
                    sections[-1].question_types = inferred
                    sections[-1].marks_per_question = q_marks
                    sections[-1].expected_count = q_count

        if not sections:
            sections = [
                TemplateSectionRule(
                    name="Section A",
                    subtitle="Multiple Choice Questions",
                    question_types=["mcq"],
                ),
                TemplateSectionRule(
                    name="Section B",
                    subtitle="Short Answer & Numeric Questions",
                    question_types=["subjective", "numeric"],
                ),
                TemplateSectionRule(
                    name="Section C",
                    subtitle="Long Answer, Diagram, Derivation & Application Questions",
                    question_types=["diagram", "derivation", "application"],
                ),
            ]
        else:
            # Ensure all 6 question types are covered across extracted sections
            covered = {t for s in sections for t in s.question_types}
            all_types = ["mcq", "subjective", "numeric", "diagram", "derivation", "application"]
            missing = [t for t in all_types if t not in covered]
            if missing:
                sections[-1].question_types.extend(missing)

        return TemplateDefinition(
            template_id=f"custom_{re.sub(r'[^a-z0-9]+', '_', source_name.lower())}",
            template_name=f"Uploaded Template ({source_name})",
            description="Custom template structure automatically extracted from uploaded document.",
            page_size="A4",
            header=TemplateHeaderConfig(
                show_logo=True,
                show_school_name=True,
                border_style="double",
            ),
            metadata=TemplateMetadataConfig(
                show_class=has_class or True,
                show_subject=has_subject or True,
                show_maximum_marks=has_marks or True,
                show_duration=has_time or True,
            ),
            instructions=instructions,
            sections=sections,
            question_patterns=question_patterns,
            footer=TemplateFooterConfig(show_page_numbers=True, footer_note="End of Question Paper"),
            is_custom_uploaded=True,
        )

    @staticmethod
    def _infer_types_from_text(text: str) -> List[str]:
        lower = text.lower()
        found: List[str] = []
        if any(k in lower for k in ("mcq", "multiple choice", "objective")):
            found.append("mcq")
        if any(k in lower for k in ("short answer", "long answer", "descriptive", "subjective", "theory")):
            found.append("subjective")
        if any(k in lower for k in ("numeric", "numerical", "calculation", "problem")):
            found.append("numeric")
        if any(k in lower for k in ("diagram", "figure", "draw", "label")):
            found.append("diagram")
        if any(k in lower for k in ("derivation", "derive", "proof", "prove")):
            found.append("derivation")
        if any(k in lower for k in ("application", "case study", "case-based", "real-world")):
            found.append("application")
        return found or ["mcq", "subjective", "numeric"]
