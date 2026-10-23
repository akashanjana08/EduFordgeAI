"""Main Streamlit entry point for the AI Question Paper Generator."""
from __future__ import annotations

import streamlit as st

from app.config.model_config import LLMConfig, SUPPORTED_GEMINI_MODELS
from app.config.settings import get_settings
from app.models.question import (
    DifficultyLevel,
    MixedDifficultyDistribution,
    Question,
    QuestionConfiguration,
    QuestionType,
    QuestionTypeConfig,
    SubjectiveSubtype,
)
from app.models.question_paper import QuestionPaper, SchoolDetails
from app.services.document_parser import DocumentParserService
from app.services.llm_service import GeminiLLMService, LLMServiceError
from app.services.pdf_service import PDFService
from app.services.question_generator import QuestionGeneratorService
from app.services.template_service import PREDEFINED_TEMPLATES, TemplateService
from app.services.validation_service import ValidationService
from app.utils.file_utils import FileValidationError, validate_and_inspect_logo
from app.utils.helpers import parse_topics

GRADES = [f"Grade {i}" for i in range(1, 13)] + ["Custom Class / Grade"]
SUBJECTS = [
    "Mathematics",
    "Science",
    "Physics",
    "Chemistry",
    "Biology",
    "English",
    "Hindi",
    "Social Science",
    "Computer Science",
    "History",
    "Geography",
    "Economics",
    "Business Studies",
    "Accountancy",
    "General Knowledge",
    "Custom Subject",
]


@st.cache_resource
def get_cached_llm_service(
    model_name: str, temperature: float, max_output_tokens: int, batch_size: int
) -> GeminiLLMService:
    """Create and cache a reusable GeminiLLMService instance."""
    cfg = LLMConfig(
        model_name=model_name,
        temperature=temperature,
        max_output_tokens=max_output_tokens,
        batch_size=batch_size,
    )
    return GeminiLLMService(config=cfg)


def init_session_state() -> None:
    """Initialize required Streamlit session state keys."""
    settings = get_settings()
    defaults = {
        "school_details": SchoolDetails(),
        "uploaded_logo": None,
        "selected_template": "template_3_cbse",
        "uploaded_template": None,
        "class_name": "Grade 10",
        "subject": "Mathematics",
        "topics": (
            "Real Numbers\nPolynomials\nLinear Equations\nQuadratic Equations\n"
            "Arithmetic Progression\nTriangles\nStatistics\nProbability"
        ),
        "total_marks": 80,
        "question_configuration": [
            QuestionTypeConfig(
                question_type=QuestionType.MCQ,
                enabled=True,
                count=20,
                marks_per_question=1,
                difficulty=DifficultyLevel.EASY,
                num_options=4,
            ),
            QuestionTypeConfig(
                question_type=QuestionType.SUBJECTIVE,
                enabled=True,
                count=5,
                marks_per_question=2,
                difficulty=DifficultyLevel.MODERATE,
                subjective_subtype=SubjectiveSubtype.SHORT_ANSWER,
            ),
            QuestionTypeConfig(
                question_type=QuestionType.NUMERIC,
                enabled=True,
                count=5,
                marks_per_question=4,
                difficulty=DifficultyLevel.MODERATE,
            ),
            QuestionTypeConfig(
                question_type=QuestionType.APPLICATION,
                enabled=True,
                count=3,
                marks_per_question=10,
                difficulty=DifficultyLevel.DIFFICULT,
            ),
            QuestionTypeConfig(
                question_type=QuestionType.DIAGRAM,
                enabled=False,
                count=2,
                marks_per_question=5,
                difficulty=DifficultyLevel.MODERATE,
            ),
            QuestionTypeConfig(
                question_type=QuestionType.DERIVATION,
                enabled=False,
                count=2,
                marks_per_question=5,
                difficulty=DifficultyLevel.DIFFICULT,
            ),
        ],
        "global_difficulty": DifficultyLevel.MIXED,
        "mixed_distribution": MixedDifficultyDistribution(
            easy_pct=30, moderate_pct=50, difficult_pct=20
        ),
        "allow_broad_syllabus": False,
        "llm_model": settings.gemini_model,
        "llm_temperature": settings.gemini_temperature,
        "llm_max_tokens": settings.gemini_max_output_tokens,
        "llm_batch_size": settings.question_batch_size,
        "generated_questions": [],
        "validation_results": None,
        "paper_preview": None,
        "generated_pdf": None,
        "answer_key": None,
    }
    for key, val in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = val


def build_current_config() -> QuestionConfiguration:
    """Construct validated QuestionConfiguration from session state."""
    parsed_topics = parse_topics(st.session_state["topics"])
    if not parsed_topics:
        parsed_topics = ["General Syllabus"]
    return QuestionConfiguration(
        class_name=st.session_state["class_name"],
        subject=st.session_state["subject"],
        maximum_marks=int(st.session_state["total_marks"]),
        topics=parsed_topics,
        allow_broad_syllabus=bool(st.session_state["allow_broad_syllabus"]),
        global_difficulty=st.session_state["global_difficulty"],
        mixed_distribution=st.session_state["mixed_distribution"],
        type_configs=st.session_state["question_configuration"],
    )


def rebuild_paper_and_validation() -> None:
    """Re-run validation and template mapping after any question update."""
    config = build_current_config()
    questions = st.session_state["generated_questions"]
    validation = ValidationService.validate_paper(config, questions)
    st.session_state["validation_results"] = validation

    active_template = (
        st.session_state["uploaded_template"]
        if st.session_state["selected_template"] == "custom_uploaded"
        and st.session_state["uploaded_template"] is not None
        else TemplateService.get_template(st.session_state["selected_template"])
    )
    sections = TemplateService.map_questions_to_template(questions, active_template)
    st.session_state["paper_preview"] = QuestionPaper(
        school_details=st.session_state["school_details"],
        class_name=config.class_name,
        subject=config.subject,
        maximum_marks=config.maximum_marks,
        topics=config.topics,
        template=active_template,
        sections=sections,
        validation=validation,
    )
    st.session_state["generated_pdf"] = None
    st.session_state["answer_key"] = None


def render_sidebar() -> None:
    """Render sidebar workflow summary and AI configuration controls."""
    with st.sidebar:
        st.title("Question Paper Generator")
        st.caption("Standardized Academic Assessment Engine")
        st.markdown(
            """
            **Workflow Steps**
            1. School Details
            2. Paper Template
            3. Class & Subject
            4. Topics & Maximum Marks
            5. Question Configuration
            6. AI Configuration
            7. Generate & Validate
            """
        )
        st.divider()
        st.subheader("6. AI Configuration")
        model_ids = [m["id"] for m in SUPPORTED_GEMINI_MODELS]
        current_model = st.session_state["llm_model"]
        if current_model not in model_ids:
            model_ids.insert(0, current_model)
        st.session_state["llm_model"] = st.selectbox(
            "Gemini Model",
            options=model_ids,
            index=model_ids.index(current_model),
        )
        st.session_state["llm_temperature"] = st.slider(
            "Temperature", 0.0, 1.5, float(st.session_state["llm_temperature"]), 0.05
        )
        st.session_state["llm_max_tokens"] = st.number_input(
            "Maximum Output Tokens",
            min_value=1024,
            max_value=65536,
            value=int(st.session_state["llm_max_tokens"]),
            step=512,
        )
        st.session_state["llm_batch_size"] = st.number_input(
            "Question Batch Size",
            min_value=1,
            max_value=50,
            value=int(st.session_state["llm_batch_size"]),
        )


def render_configuration_tab() -> None:
    """Render Steps 1 through 8 in the Configuration tab."""
    school: SchoolDetails = st.session_state["school_details"]

    st.subheader("1. School / Institution Details")
    col1, col2 = st.columns([2, 1])
    with col1:
        school.school_name = st.text_input("School Name *", value=school.school_name)
        school.school_address = st.text_input("School Address", value=school.school_address or "")
        c_a, c_b, c_c = st.columns(3)
        school.exam_name = c_a.text_input("Exam Name", value=school.exam_name or "")
        school.academic_session = c_b.text_input(
            "Academic Session", value=school.academic_session or ""
        )
        school.term = c_c.text_input("Term", value=school.term or "")
        c_d, c_e = st.columns(2)
        school.exam_date = c_d.text_input("Date", value=school.exam_date or "")
        school.time_duration = c_e.text_input("Time Duration", value=school.time_duration or "")
    with col2:
        logo_file = st.file_uploader(
            "School Logo (PNG, JPG, JPEG, WEBP)", type=["png", "jpg", "jpeg", "webp"]
        )
        if logo_file is not None:
            try:
                raw_bytes = logo_file.getvalue()
                valid_bytes, mime, dims = validate_and_inspect_logo(raw_bytes, logo_file.name)
                school.logo_bytes = valid_bytes
                school.logo_mime_type = mime
                school.logo_filename = logo_file.name
                st.session_state["uploaded_logo"] = valid_bytes
                st.image(valid_bytes, caption=f"{logo_file.name} ({dims[0]}x{dims[1]}px)", width=120)
            except FileValidationError as exc:
                st.error(str(exc))

    st.divider()
    st.subheader("2. Question Paper Layout & Template")
    t_col1, t_col2 = st.columns(2)
    with t_col1:
        template_options = {k: v.template_name for k, v in PREDEFINED_TEMPLATES.items()}
        if st.session_state["uploaded_template"] is not None:
            template_options["custom_uploaded"] = st.session_state[
                "uploaded_template"
            ].template_name
        st.session_state["selected_template"] = st.selectbox(
            "Select Predefined or Uploaded Template",
            options=list(template_options.keys()),
            format_func=lambda k: template_options[k],
        )
    with t_col2:
        uploaded_doc = st.file_uploader(
            "Or Upload Existing Question Paper Format (PDF, DOCX, DOC)",
            type=["pdf", "docx", "doc"],
        )
        if uploaded_doc is not None:
            try:
                extracted = DocumentParserService.parse_uploaded_template(
                    uploaded_doc.getvalue(), uploaded_doc.name
                )
                st.session_state["uploaded_template"] = extracted
                st.session_state["selected_template"] = "custom_uploaded"
                st.success(
                    f"Extracted {len(extracted.sections)} sections from '{uploaded_doc.name}'."
                )
            except FileValidationError as exc:
                st.error(str(exc))

    st.divider()
    st.subheader("3. Class, Subject, Maximum Marks & Topics")
    m1, m2, m3 = st.columns(3)
    with m1:
        selected_grade = st.selectbox("Select Class / Grade", options=GRADES, index=9)
        if selected_grade == "Custom Class / Grade":
            st.session_state["class_name"] = st.text_input(
                "Enter Custom Class", value=st.session_state["class_name"]
            )
        else:
            st.session_state["class_name"] = selected_grade
    with m2:
        selected_subj = st.selectbox("Select Subject", options=SUBJECTS, index=0)
        if selected_subj == "Custom Subject":
            st.session_state["subject"] = st.text_input(
                "Enter Custom Subject", value=st.session_state["subject"]
            )
        else:
            st.session_state["subject"] = selected_subj
    with m3:
        st.session_state["total_marks"] = int(
            st.number_input("Maximum Marks", min_value=5, max_value=500, value=int(st.session_state["total_marks"]), step=5)
        )

    st.session_state["topics"] = st.text_area(
        "Enter Chapters / Topics (one per line or comma-separated)",
        value=st.session_state["topics"],
        height=110,
    )
    st.session_state["allow_broad_syllabus"] = st.checkbox(
        "Allow broader syllabus coverage beyond listed topics",
        value=bool(st.session_state["allow_broad_syllabus"]),
    )

    st.divider()
    st.subheader("4. Question Types & Difficulty Configuration")
    for idx, q_cfg in enumerate(st.session_state["question_configuration"]):
        with st.expander(
            f"{q_cfg.question_type.value.upper()} — "
            f"{'Enabled (' + str(q_cfg.total_marks) + ' Marks)' if q_cfg.enabled else 'Disabled'}",
            expanded=q_cfg.enabled,
        ):
            c1, c2, c3, c4 = st.columns(4)
            q_cfg.enabled = c1.checkbox(
                f"Enable {q_cfg.question_type.value.upper()}",
                value=q_cfg.enabled,
                key=f"en_{idx}",
            )
            q_cfg.count = int(
                c2.number_input(
                    "Number of Questions",
                    min_value=1,
                    max_value=100,
                    value=int(q_cfg.count),
                    key=f"cnt_{idx}",
                )
            )
            q_cfg.marks_per_question = int(
                c3.number_input(
                    "Marks Per Question",
                    min_value=1,
                    max_value=50,
                    value=int(q_cfg.marks_per_question),
                    key=f"mk_{idx}",
                )
            )
            diff_opts = [d for d in DifficultyLevel]
            q_cfg.difficulty = c4.selectbox(
                "Difficulty",
                options=diff_opts,
                index=diff_opts.index(q_cfg.difficulty),
                format_func=lambda d: d.value,
                key=f"df_{idx}",
            )
            if q_cfg.question_type == QuestionType.MCQ:
                q_cfg.num_options = int(
                    st.number_input(
                        "Number of MCQ Options",
                        min_value=2,
                        max_value=6,
                        value=int(q_cfg.num_options),
                        key=f"opt_{idx}",
                    )
                )
            elif q_cfg.question_type == QuestionType.SUBJECTIVE:
                sub_opts = [s for s in SubjectiveSubtype]
                q_cfg.subjective_subtype = st.selectbox(
                    "Subjective Format",
                    options=sub_opts,
                    format_func=lambda s: s.value.replace("_", " ").title(),
                    key=f"sub_{idx}",
                )

    config = build_current_config()
    if config.configured_total_marks == config.maximum_marks:
        st.success(
            f"Marks Allocation Validated: {config.configured_total_marks} / {config.maximum_marks} Marks "
            f"across {config.configured_total_questions} questions."
        )
    else:
        st.warning(
            f"Configured Marks ({config.configured_total_marks}) != Maximum Marks ({config.maximum_marks}). "
            "Adjust question counts or marks per question before generating."
        )

    if st.button("Generate Question Paper with Gemini AI", type="primary"):
        if config.configured_total_marks != config.maximum_marks:
            st.error("Total configured marks must match Maximum Marks before generating.")
            return
        with st.status("Generating and validating standardized question paper...", expanded=True) as status:
            try:
                st.write("Initializing configurable Gemini LLM service...")
                llm = get_cached_llm_service(
                    st.session_state["llm_model"],
                    float(st.session_state["llm_temperature"]),
                    int(st.session_state["llm_max_tokens"]),
                    int(st.session_state["llm_batch_size"]),
                )
                generator = QuestionGeneratorService(llm)
                st.write("Generating structured questions from curriculum topics...")
                questions, _ = generator.generate_all_questions(config)
                st.session_state["generated_questions"] = questions
                rebuild_paper_and_validation()
                status.update(label="Question Paper Generated & Validated!", state="complete")
                st.success(f"Generated {len(questions)} questions totaling {config.maximum_marks} marks.")
            except (LLMServiceError, ValueError) as exc:
                status.update(label="Generation failed", state="error")
                st.error(str(exc))


def render_questions_tab() -> None:
    """Render review, single-question regeneration, inline edit, delete, and manual addition."""
    questions: list[Question] = st.session_state["generated_questions"]
    validation = st.session_state["validation_results"]

    if validation:
        cols = st.columns(len(validation.checks))
        for col, chk in zip(cols, validation.checks):
            icon = "✓" if chk.passed else "✗"
            col.metric(label=f"{icon} {chk.label}", value=chk.message)
        if not validation.is_valid:
            for err in validation.errors:
                st.error(err)

    if not questions:
        st.info("No questions generated yet. Use the Configuration tab to generate questions.")
        return

    for idx, q in enumerate(questions):
        with st.expander(
            f"{q.id} [{q.type.value.upper()} · {q.marks} Marks · {q.difficulty}] — {q.question[:85]}",
            expanded=False,
        ):
            new_q_text = st.text_area("Question Text", value=q.question, key=f"edit_q_{q.id}")
            new_ans = st.text_input(
                "Correct Answer (Stored for Answer Key only)",
                value=q.correct_answer or "",
                key=f"edit_ans_{q.id}",
            )
            new_sol = st.text_area(
                "Solution / Marking Scheme",
                value=q.solution or "",
                key=f"edit_sol_{q.id}",
            )
            b1, b2, b3 = st.columns(3)
            if b1.button("Save Edits", key=f"save_{q.id}"):
                q.question = new_q_text
                q.correct_answer = new_ans
                q.solution = new_sol
                rebuild_paper_and_validation()
                st.success(f"Updated {q.id}.")
            if b2.button(f"Regenerate {q.id}", key=f"regen_{q.id}"):
                try:
                    llm = get_cached_llm_service(
                        st.session_state["llm_model"],
                        float(st.session_state["llm_temperature"]),
                        int(st.session_state["llm_max_tokens"]),
                        int(st.session_state["llm_batch_size"]),
                    )
                    gen = QuestionGeneratorService(llm)
                    updated_qs, _ = gen.regenerate_single_question(
                        build_current_config(), questions, q.id
                    )
                    st.session_state["generated_questions"] = updated_qs
                    rebuild_paper_and_validation()
                    st.rerun()
                except Exception as exc:
                    st.error(str(exc))
            if b3.button(f"Delete {q.id}", key=f"del_{q.id}"):
                st.session_state["generated_questions"].pop(idx)
                rebuild_paper_and_validation()
                st.rerun()


def render_preview_and_download_tabs(preview_tab, download_tab) -> None:
    """Render live paper preview and PDF generation/download controls."""
    paper: QuestionPaper | None = st.session_state["paper_preview"]
    with preview_tab:
        if not paper:
            st.info("Generate questions first to preview the formatted question paper.")
        else:
            st.markdown(f"### {paper.school_details.school_name.upper()}")
            st.caption(
                f"{paper.school_details.exam_name} | Class: {paper.class_name} | "
                f"Subject: {paper.subject} | Time: {paper.school_details.time_duration} | "
                f"Maximum Marks: {paper.maximum_marks}"
            )
            st.divider()
            st.markdown("**General Instructions:**")
            for i, inst in enumerate(paper.template.instructions, start=1):
                st.markdown(f"{i}. {inst}")
            q_num = 1
            for section in paper.sections:
                st.markdown(f"#### {section.name} ({section.marks_summary_label})")
                if section.subtitle:
                    st.caption(section.subtitle)
                for q in section.questions:
                    st.markdown(f"**Q{q_num}.** {q.question} *(Marks: {q.marks})*")
                    if q.type == QuestionType.MCQ and q.options:
                        for opt_i, opt in enumerate(q.options):
                            st.markdown(f"&nbsp;&nbsp;&nbsp;&nbsp;**{chr(65 + opt_i)}.** {opt}")
                    q_num += 1

    with download_tab:
        if not paper or not paper.validation:
            st.info("Generate and validate questions before building the final PDF.")
            return
        if not paper.validation.marks_validated:
            st.error(
                f"PDF generation blocked: Total marks ({paper.total_marks}) != Maximum Marks ({paper.maximum_marks})."
            )
            return

        include_answer_key = st.checkbox("Generate Separate Confidential Answer Key PDF", value=True)
        if st.button("Build Printable A4 PDFs", type="primary"):
            with st.spinner("Rendering printable A4 PDFs..."):
                st.session_state["generated_pdf"] = PDFService.generate_question_paper_pdf(paper)
                if include_answer_key:
                    st.session_state["answer_key"] = PDFService.generate_answer_key_pdf(paper)
                st.success("PDF documents generated and ready for download.")

        if st.session_state["generated_pdf"]:
            st.download_button(
                label="Download Student Question Paper PDF",
                data=st.session_state["generated_pdf"],
                file_name=f"{paper.subject}_{paper.class_name}_Question_Paper.pdf".replace(" ", "_"),
                mime="application/pdf",
            )
        if st.session_state["answer_key"]:
            st.download_button(
                label="Download Answer Key & Marking Scheme PDF",
                data=st.session_state["answer_key"],
                file_name=f"{paper.subject}_{paper.class_name}_Answer_Key.pdf".replace(" ", "_"),
                mime="application/pdf",
            )


def main() -> None:
    st.set_page_config(
        page_title="EduForge AI — Question Paper Generator",
        layout="wide",
        initial_sidebar_state="expanded",
    )
    init_session_state()
    render_sidebar()

    tabs = st.tabs(["Configuration", "Generated Questions", "Preview", "Download"])
    with tabs[0]:
        render_configuration_tab()
    with tabs[1]:
        render_questions_tab()
    render_preview_and_download_tabs(tabs[2], tabs[3])


if __name__ == "__main__":
    main()
