import {
  MixedDifficultyDistribution,
  Question,
  QuestionSection,
  QuestionType,
  QuestionTypeConfig,
  TemplateDefinition,
  TemplateSectionRule,
  ValidationCheckItem,
  ValidationResult,
} from "../types";

export const DEFAULT_LOGO_SVG_DATA_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <rect width="160" height="160" rx="28" fill="#0F172A"/>
  <path d="M80 22 L130 42 L130 82 C130 114 106 134 80 144 C54 134 30 114 30 82 L30 42 Z" fill="#1E293B" stroke="#E2E8F0" stroke-width="4"/>
  <path d="M80 44 L108 60 L80 76 L52 60 Z" fill="#0284C7"/>
  <path d="M60 68 L60 94 C60 102 69 108 80 108 C91 108 100 102 100 94 L100 68" fill="none" stroke="#F8FAFC" stroke-width="4" stroke-linecap="round"/>
  <text x="80" y="128" font-family="Georgia, serif" font-size="10" font-weight="bold" fill="#E2E8F0" text-anchor="middle">SCIENTIA ET VIRTUS</text>
</svg>`);

export const PREDEFINED_TEMPLATES: TemplateDefinition[] = [
  {
    templateId: "template_1_simple",
    templateName: "Template 1 - Simple School Format",
    description:
      "Clean single-column traditional school examination layout with standard Sections A, B, and C.",
    pageSize: "A4",
    twoColumnQuestions: false,
    compactSpacing: false,
    borderStyle: "single",
    logoPosition: "left",
    instructions: [
      "All questions are compulsory.",
      "Marks for each question are indicated against it on the right margin.",
      "Show all necessary calculation steps clearly wherever applicable.",
      "Write neat and legible answers; draw labeled diagrams wherever required.",
    ],
    sections: [
      {
        name: "Section A",
        subtitle: "Objective & Multiple Choice Questions",
        questionTypes: ["mcq"],
      },
      {
        name: "Section B",
        subtitle: "Short Answer & Numerical Problems",
        questionTypes: ["subjective", "numeric"],
      },
      {
        name: "Section C",
        subtitle: "Diagram, Derivation & Application Questions",
        questionTypes: ["diagram", "derivation", "application"],
      },
    ],
    footerNote: "All the Best",
  },
  {
    templateId: "template_2_modern",
    templateName: "Template 2 - Modern School Format",
    description:
      "Contemporary institutional layout with 4-column metadata bar and distinct modular parts.",
    pageSize: "A4",
    twoColumnQuestions: false,
    compactSpacing: false,
    borderStyle: "modern_accent",
    logoPosition: "left",
    instructions: [
      "Read each question carefully before answering.",
      "All working notes must be shown adjacent to numerical and derivation responses.",
      "Figures in brackets on the right indicate full marks for the question.",
    ],
    sections: [
      {
        name: "Part I — Multiple Choice Assessment",
        subtitle: "Select the single best option for each question",
        questionTypes: ["mcq"],
      },
      {
        name: "Part II — Theoretical & Quantitative Analysis",
        subtitle: "Provide concise explanations and exact calculations",
        questionTypes: ["subjective", "numeric", "diagram"],
      },
      {
        name: "Part III — Derivations & Applied Scenarios",
        subtitle: "Extended analytical and real-world synthesis",
        questionTypes: ["derivation", "application"],
      },
    ],
    footerNote: " Institutional Assessment — Confidential",
  },
  {
    templateId: "template_3_cbse",
    templateName: "Template 3 - CBSE Style",
    description:
      "Standardized Board Examination format featuring formal General Instructions and Sections A through E.",
    pageSize: "A4",
    twoColumnQuestions: false,
    compactSpacing: false,
    borderStyle: "double",
    logoPosition: "center",
    instructions: [
      "This Question Paper has 5 Sections: Section A, Section B, Section C, Section D, and Section E.",
      "All questions are compulsory. Marks are indicated against each question on the right.",
      "Section A comprises Multiple Choice Questions (MCQs).",
      "Section B comprises Numerical Problems requiring step-by-step working.",
      "Section C comprises Subjective Short/Long Answer questions.",
      "Section D comprises Derivations and Diagram-based questions.",
      "Section E comprises Application / Case-based integrated questions.",
      "Draw neat figures wherever required. Use of calculators is not permitted.",
    ],
    sections: [
      {
        name: "SECTION A",
        subtitle: "Multiple Choice Questions",
        questionTypes: ["mcq"],
      },
      {
        name: "SECTION B",
        subtitle: "Numerical Problems",
        questionTypes: ["numeric"],
      },
      {
        name: "SECTION C",
        subtitle: "Subjective & Descriptive Questions",
        questionTypes: ["subjective"],
      },
      {
        name: "SECTION D",
        subtitle: "Derivations & Diagram-Based Questions",
        questionTypes: ["derivation", "diagram"],
      },
      {
        name: "SECTION E",
        subtitle: "Application & Case-Study Questions",
        questionTypes: ["application"],
      },
    ],
    footerNote: "All the Best",
  },
  {
    templateId: "template_4_compact",
    templateName: "Template 4 - Compact Format",
    description:
      "High-density layout optimized to reduce paper consumption for periodic tests and mid-term evaluations.",
    pageSize: "A4",
    twoColumnQuestions: false,
    compactSpacing: true,
    borderStyle: "minimal",
    logoPosition: "left",
    instructions: [
      "Attempt all questions concisely. Marks are indicated in brackets on the right.",
    ],
    sections: [
      {
        name: "Section I — Objective & Numeric",
        subtitle: "Direct response and calculation items",
        questionTypes: ["mcq", "numeric"],
      },
      {
        name: "Section II — Subjective, Diagram & Applied",
        subtitle: "Structured analytical items",
        questionTypes: ["subjective", "diagram", "derivation", "application"],
      },
    ],
    footerNote: "Periodic Evaluation Paper",
  },
  {
    templateId: "template_5_header_section",
    templateName: "Template 5 - Header + Section Based",
    description:
      "Dedicated section per question category with explicit section-level rubric headers.",
    pageSize: "A4",
    twoColumnQuestions: false,
    compactSpacing: false,
    borderStyle: "double",
    logoPosition: "left",
    instructions: [
      "Answer each section in sequential order.",
      "State all physical/mathematical units clearly in numerical and derivation sections.",
    ],
    sections: [
      {
        name: "Section A: Multiple Choice",
        subtitle: "Four-option single-correct objective questions",
        questionTypes: ["mcq"],
      },
      {
        name: "Section B: Subjective Theory",
        subtitle: "Short and descriptive theoretical responses",
        questionTypes: ["subjective"],
      },
      {
        name: "Section C: Numerical Problems",
        subtitle: "Quantitative calculation problems",
        questionTypes: ["numeric"],
      },
      {
        name: "Section D: Diagrams & Derivations",
        subtitle: "Labeled illustrations and formal proofs",
        questionTypes: ["diagram", "derivation"],
      },
      {
        name: "Section E: Real-World Applications",
        subtitle: "Applied scenario problem solving",
        questionTypes: ["application"],
      },
    ],
    footerNote: "All the Best",
  },
  {
    templateId: "template_6_two_column",
    templateName: "Template 6 - Two Column Format",
    description:
      "Two-column newspaper/competitive style layout ideal for high-question-count assessments.",
    pageSize: "A4",
    twoColumnQuestions: true,
    compactSpacing: true,
    borderStyle: "double",
    logoPosition: "left",
    instructions: [
      "Questions are arranged in a two-column layout. Read down the left column first, then the right column.",
      "All questions are compulsory.",
    ],
    sections: [
      {
        name: "SECTION I — OBJECTIVE & QUANTITATIVE",
        subtitle: "Multiple Choice & Numerical Evaluation",
        questionTypes: ["mcq", "numeric"],
      },
      {
        name: "SECTION II — ANALYTICAL & STRUCTURED",
        subtitle: "Subjective, Diagram, Derivation & Application",
        questionTypes: ["subjective", "diagram", "derivation", "application"],
      },
    ],
    footerNote: "Continue to Next Column / Page",
  },
];

export function parseTopicsInput(raw: string): string[] {
  if (!raw || !raw.trim()) return [];
  const result: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    for (const part of line.split(",")) {
      const cleaned = part.replace(/^[•\-*\s]+|[•\-*\s]+$/g, "").trim();
      if (cleaned && !result.includes(cleaned)) {
        result.push(cleaned);
      }
    }
  }
  return result;
}

export function normalizeQuestionText(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/^q\d+[.):\s]*/i, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function computeSimilarity(a: string, b: string): number {
  const normA = normalizeQuestionText(a);
  const normB = normalizeQuestionText(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;
  const setA = new Set(normA.split(" "));
  const setB = new Set(normB.split(" "));
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function validateQuestionPaper(params: {
  maximumMarks: number;
  typeConfigs: QuestionTypeConfig[];
  mixedDistribution: MixedDifficultyDistribution;
  questions: Question[];
}): ValidationResult {
  const { maximumMarks, typeConfigs, mixedDistribution, questions } = params;
  const enabledConfigs = typeConfigs.filter((c) => c.enabled && c.count > 0);
  const errors: string[] = [];

  const expectedQuestions = enabledConfigs.reduce((s, c) => s + c.count, 0);
  const actualQuestions = questions.length;
  const countValidated = expectedQuestions === actualQuestions && actualQuestions > 0;
  if (!countValidated) {
    errors.push(
      `Question count mismatch: configured ${expectedQuestions} questions, currently have ${actualQuestions}.`
    );
  }

  const configuredMarks = enabledConfigs.reduce(
    (s, c) => s + c.count * c.marksPerQuestion,
    0
  );
  const actualMarks = questions.reduce((s, q) => s + Number(q.marks || 0), 0);
  const marksValidated =
    configuredMarks === maximumMarks && actualMarks === maximumMarks;

  if (configuredMarks !== maximumMarks) {
    errors.push(
      `Configured question types sum to ${configuredMarks} marks, which does not equal Maximum Marks (${maximumMarks}).`
    );
  }
  if (actualMarks !== maximumMarks) {
    errors.push(
      `Generated questions sum to ${actualMarks} marks, which does not equal Maximum Marks (${maximumMarks}).`
    );
  }

  // Question types check
  const expectedByType: Record<string, number> = {};
  for (const c of enabledConfigs) {
    expectedByType[c.questionType] = (expectedByType[c.questionType] || 0) + c.count;
  }
  const actualByType: Record<string, number> = {};
  for (const q of questions) {
    actualByType[q.type] = (actualByType[q.type] || 0) + 1;
  }
  let questionTypesValidated =
    Object.keys(expectedByType).length === Object.keys(actualByType).length;
  for (const [k, v] of Object.entries(expectedByType)) {
    if (actualByType[k] !== v) {
      questionTypesValidated = false;
    }
  }
  if (!questionTypesValidated && actualQuestions > 0) {
    errors.push(
      "Generated question type distribution does not match the enabled configuration."
    );
  }

  // Difficulty check
  const pctSum =
    mixedDistribution.easyPct +
    mixedDistribution.moderatePct +
    mixedDistribution.difficultPct;
  const hasMixed = enabledConfigs.some((c) => c.difficulty === "Mixed");
  const difficultyValidated =
    (!hasMixed || pctSum === 100) &&
    questions.every((q) =>
      ["Easy", "Moderate", "Difficult"].includes(q.difficulty)
    );
  if (hasMixed && pctSum !== 100) {
    errors.push(`Mixed difficulty percentages must equal 100% (currently ${pctSum}%).`);
  }

  // Duplicate check
  const duplicatePairs: string[] = [];
  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      const sim = computeSimilarity(questions[i].question, questions[j].question);
      if (sim >= 0.82) {
        duplicatePairs.push(
          `${questions[i].id} & ${questions[j].id} (${Math.round(sim * 100)}% match)`
        );
      }
    }
  }
  const noDuplicatesDetected = duplicatePairs.length === 0;
  if (!noDuplicatesDetected) {
    errors.push(
      `Duplicate or near-duplicate questions detected: ${duplicatePairs.join(", ")}.`
    );
  }

  // MCQ & Numeric validation
  let mcqValidated = true;
  let numericValidated = true;
  for (const q of questions) {
    if (q.type === "mcq") {
      if (!q.options || q.options.length < 4 || !q.correct_answer?.trim()) {
        mcqValidated = false;
        errors.push(`${q.id}: MCQ requires 4 options and 1 correct answer.`);
      }
    }
    if (q.type === "numeric") {
      if (!q.correct_answer?.trim()) {
        numericValidated = false;
        errors.push(`${q.id}: Numeric question requires a verified answer.`);
      }
    }
  }

  const checks: ValidationCheckItem[] = [
    {
      key: "count",
      label: "Question count validated",
      passed: countValidated,
      detail: `${actualQuestions} / ${expectedQuestions} Questions`,
    },
    {
      key: "marks",
      label: "Marks validated",
      passed: marksValidated,
      detail: `${actualMarks} / ${maximumMarks} Marks`,
    },
    {
      key: "difficulty",
      label: "Difficulty validated",
      passed: difficultyValidated,
      detail: hasMixed ? `Mixed (${pctSum}%)` : "Standard Levels",
    },
    {
      key: "types",
      label: "Question types validated",
      passed: questionTypesValidated && mcqValidated && numericValidated,
      detail: `${enabledConfigs.length} Active Type(s)`,
    },
    {
      key: "duplicates",
      label: "No duplicate questions detected",
      passed: noDuplicatesDetected,
      detail: noDuplicatesDetected
        ? "100% Unique Stem Text"
        : `${duplicatePairs.length} Pair(s) Flagged`,
    },
  ];

  const isValid =
    countValidated &&
    marksValidated &&
    difficultyValidated &&
    questionTypesValidated &&
    noDuplicatesDetected &&
    mcqValidated &&
    numericValidated;

  return {
    isValid,
    countValidated,
    marksValidated,
    difficultyValidated,
    questionTypesValidated,
    noDuplicatesDetected,
    mcqValidated,
    numericValidated,
    expectedQuestions,
    actualQuestions,
    expectedMarks: maximumMarks,
    actualMarks,
    duplicatePairs,
    errors,
    checks,
  };
}

export function mapQuestionsToTemplate(
  questions: Question[],
  template: TemplateDefinition
): QuestionSection[] {
  const assigned = new Set<string>();
  const sections: QuestionSection[] = [];

  for (const rule of template.sections) {
    const matched: Question[] = [];
    for (const q of questions) {
      if (assigned.has(q.id)) continue;
      if (rule.questionTypes.includes(q.type)) {
        q.section_name = rule.name;
        matched.push(q);
        assigned.add(q.id);
      }
    }
    if (matched.length > 0) {
      const sectionMarks = matched.reduce((s, q) => s + q.marks, 0);
      const uniqueMarks = Array.from(new Set(matched.map((q) => q.marks)));
      const marksSummaryLabel =
        uniqueMarks.length === 1
          ? `${matched.length} × ${uniqueMarks[0]} = ${sectionMarks}`
          : `Total Marks: ${sectionMarks}`;
      sections.push({
        name: rule.name,
        subtitle: rule.subtitle,
        questions: matched,
        sectionMarks,
        marksSummaryLabel,
      });
    }
  }

  const remaining = questions.filter((q) => !assigned.has(q.id));
  if (remaining.length > 0) {
    const sectionMarks = remaining.reduce((s, q) => s + q.marks, 0);
    sections.push({
      name: `Section ${String.fromCharCode(65 + sections.length)}`,
      subtitle: "Additional Assessment Questions",
      questions: remaining,
      sectionMarks,
      marksSummaryLabel: `Total Marks: ${sectionMarks}`,
    });
  }

  return sections;
}

export function extractTemplateFromUploadedDocumentText(
  rawText: string,
  filename: string
): TemplateDefinition {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const instructions: string[] = [];
  let inInst = false;
  for (const ln of lines) {
    if (/^(general\s+)?instructions?\b/i.test(ln)) {
      inInst = true;
      continue;
    }
    if (inInst) {
      if (/^(section|part)\s+[a-z0-9ivx]+\b/i.test(ln) || /^q\.?\s*1\b/i.test(ln)) {
        break;
      }
      const cleaned = ln.replace(/^[\d.)\-•*]+\s*/, "").trim();
      if (cleaned.length >= 8 && cleaned.length <= 200 && instructions.length < 7) {
        instructions.push(cleaned);
      }
    }
  }

  const sections: TemplateSectionRule[] = [];
  const questionPatterns: NonNullable<TemplateDefinition["questionPatterns"]> = [];

  for (const ln of lines) {
    const secMatch = ln.match(/^(SECTION\s+[A-Z0-9IVX]+|PART\s+[A-Z0-9IVX]+)\b[:\-\s]*(.*)$/i);
    if (secMatch) {
      const secName = secMatch[1].toUpperCase();
      const sub = secMatch[2] || "Standard Section";
      sections.push({
        name: secName,
        subtitle: sub,
        questionTypes: inferQuestionTypesFromLine(sub || ln),
      });
      continue;
    }
    const patMatch = ln.match(
      /(\d+)\s*(?:questions?|mcqs?|short\s+answer|long\s+answer|numeric|application|diagram|derivation).*?[x×*]\s*(\d+)\s*marks?/i
    );
    if (patMatch) {
      const count = Number(patMatch[1]);
      const marks = Number(patMatch[2]);
      const types = inferQuestionTypesFromLine(ln);
      questionPatterns.push({
        section: sections[sections.length - 1]?.name || `Section ${String.fromCharCode(65 + questionPatterns.length)}`,
        count,
        marksPerQuestion: marks,
        questionTypes: types,
        rawPattern: ln.slice(0, 100),
      });
      if (sections.length > 0) {
        sections[sections.length - 1].questionTypes = types;
        sections[sections.length - 1].marksPerQuestion = marks;
        sections[sections.length - 1].expectedCount = count;
      }
    }
  }

  if (sections.length === 0) {
    sections.push(
      {
        name: "SECTION A",
        subtitle: "Multiple Choice Questions (Extracted)",
        questionTypes: ["mcq"],
      },
      {
        name: "SECTION B",
        subtitle: "Short Answer & Numeric Questions (Extracted)",
        questionTypes: ["subjective", "numeric"],
      },
      {
        name: "SECTION C",
        subtitle: "Long Answer, Diagram, Derivation & Application (Extracted)",
        questionTypes: ["diagram", "derivation", "application"],
      }
    );
  } else {
    const covered = new Set(sections.flatMap((s) => s.questionTypes));
    const allTypes: QuestionType[] = [
      "mcq",
      "subjective",
      "numeric",
      "diagram",
      "derivation",
      "application",
    ];
    for (const t of allTypes) {
      if (!covered.has(t)) {
        sections[sections.length - 1].questionTypes.push(t);
      }
    }
  }

  return {
    templateId: "custom_uploaded",
    templateName: `Uploaded Format (${filename})`,
    description:
      "Reusable structural template extracted from uploaded question-paper document.",
    pageSize: "A4",
    twoColumnQuestions: false,
    compactSpacing: false,
    borderStyle: "double",
    logoPosition: "left",
    instructions:
      instructions.length > 0
        ? instructions
        : [
            "All questions are compulsory.",
            "Marks for each question are indicated against it on the right margin.",
            "Show all necessary calculation steps clearly.",
          ],
    sections,
    questionPatterns,
    footerNote: "End of Question Paper",
    isCustomUploaded: true,
  };
}

function inferQuestionTypesFromLine(text: string): QuestionType[] {
  const lower = text.toLowerCase();
  const out: QuestionType[] = [];
  if (lower.includes("mcq") || lower.includes("multiple choice") || lower.includes("objective")) {
    out.push("mcq");
  }
  if (
    lower.includes("short") ||
    lower.includes("long") ||
    lower.includes("subjective") ||
    lower.includes("descriptive")
  ) {
    out.push("subjective");
  }
  if (lower.includes("numeric") || lower.includes("calculation") || lower.includes("problem")) {
    out.push("numeric");
  }
  if (lower.includes("diagram") || lower.includes("figure") || lower.includes("draw")) {
    out.push("diagram");
  }
  if (lower.includes("derivation") || lower.includes("derive") || lower.includes("proof")) {
    out.push("derivation");
  }
  if (lower.includes("application") || lower.includes("case")) {
    out.push("application");
  }
  return out.length > 0 ? out : ["mcq", "subjective", "numeric"];
}
