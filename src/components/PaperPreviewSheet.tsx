import React from "react";
import {
  QuestionSection,
  SchoolDetails,
  TemplateDefinition,
} from "../types";
import { DEFAULT_LOGO_SVG_DATA_URL } from "../services/validationAndTemplate";
import { buildDiagramSvgDataUrl } from "../services/diagramRenderer";

interface PaperPreviewSheetProps {
  school: SchoolDetails;
  className: string;
  subject: string;
  maximumMarks: number;
  template: TemplateDefinition;
  sections: QuestionSection[];
  viewMode: "student" | "answer_key";
}

export const PaperPreviewSheet: React.FC<PaperPreviewSheetProps> = ({
  school,
  className,
  subject,
  maximumMarks,
  template,
  sections,
  viewMode,
}) => {
  const logoSrc = school.logoDataUrl || DEFAULT_LOGO_SVG_DATA_URL;
  let globalQNumber = 1;

  return (
    <div className="bg-white border border-slate-300 shadow-sm max-w-[860px] w-full mx-auto p-4 sm:p-8 md:p-12 text-slate-900 overflow-hidden">
      {/* Header */}
      <div
        className={`pb-4 mb-4 ${
          template.borderStyle === "double"
            ? "border-b-4 border-double border-slate-900"
            : template.borderStyle === "modern_accent"
            ? "border-b-2 border-sky-700"
            : "border-b border-slate-300"
        }`}
      >
        <div
          className={`flex ${
            template.logoPosition === "center"
              ? "flex-col items-center text-center gap-3"
              : "flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6 text-center sm:text-left"
          }`}
        >
          <img
            src={logoSrc}
            alt={`${school.schoolName} Crest`}
            referrerPolicy="no-referrer"
            className="w-14 h-14 sm:w-16 sm:h-16 object-contain shrink-0 rounded-md border border-slate-200 p-1 bg-slate-50"
          />
          <div className="flex-1 text-center min-w-0">
            <h2 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-slate-950 uppercase break-words">
              {school.schoolName || "ABC International School"}
            </h2>
            {school.schoolAddress && !template.compactSpacing && (
              <p className="text-xs text-slate-600 mt-0.5 break-words">
                {school.schoolAddress}
              </p>
            )}
            <p className="text-xs sm:text-sm font-semibold text-slate-800 mt-1.5 uppercase tracking-wide break-words">
              {viewMode === "answer_key"
                ? `CONFIDENTIAL ANSWER KEY & MARKING SCHEME — ${subject}`
                : [school.examName, school.term, school.academicSession]
                     .filter(Boolean)
                    .join(" · ")}
            </p>
          </div>
          {template.logoPosition !== "center" && (
            <div className="w-16 hidden sm:block shrink-0" aria-hidden="true" />
          )}
        </div>

        {/* Metadata bar */}
        <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-xs font-medium text-slate-800 tabular-nums">
          <div>
            <span className="text-slate-500">Class:</span>{" "}
            <span className="font-semibold">{className}</span>
          </div>
          <div>
            <span className="text-slate-500">Subject:</span>{" "}
            <span className="font-semibold">{subject}</span>
          </div>
          <div>
            <span className="text-slate-500">Time:</span>{" "}
            <span className="font-semibold">
              {school.timeDuration || "3 Hours"}
            </span>
          </div>
          <div className="sm:text-right">
            <span className="text-slate-500">Maximum Marks:</span>{" "}
            <span className="font-semibold">{maximumMarks}</span>
          </div>
        </div>
      </div>

      {/* General Instructions (Student Mode Only) */}
      {viewMode === "student" && template.instructions.length > 0 && (
        <div className="mb-6 pb-4 border-b border-slate-200">
          <h3 className="text-xs font-semibold text-slate-900 mb-1.5">
            General Instructions:
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-xs text-slate-700">
            {template.instructions.map((inst, idx) => (
              <li key={idx} className="leading-relaxed">
                {inst}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Sections & Mapped Questions */}
      <div className="space-y-6">
        {sections.map((sec, sIdx) => (
          <div key={sIdx} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 border border-slate-300 px-3 sm:px-3.5 py-2">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 tracking-wide">
                  {sec.name}
                </h3>
                {sec.subtitle && (
                  <p className="text-[11px] text-slate-600 italic">
                    {sec.subtitle}
                  </p>
                )}
              </div>
              <span className="text-xs font-mono font-semibold text-slate-800 tabular-nums shrink-0">
                {sec.marksSummaryLabel}
              </span>
            </div>

            <div
              className={
                template.twoColumnQuestions && viewMode === "student"
                  ? "grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"
                  : "space-y-4"
              }
            >
              {sec.questions.map((q) => {
                const qNum = globalQNumber++;
                return (
                  <div
                    key={q.id}
                    className="py-2 border-b border-slate-100 last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                      <div className="text-xs sm:text-sm text-slate-900 leading-relaxed flex-1 min-w-0 break-words">
                        <span className="font-bold mr-1.5 tabular-nums">
                          Q{qNum}.
                        </span>
                        <span>{q.question}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-900 shrink-0 tabular-nums">
                        [{q.marks}]
                      </span>
                    </div>

                    {/* Drawn Examination Figure for Diagram Questions */}
                    {q.type === "diagram" && (
                      <div className="mt-3 ml-0 sm:ml-6 flex flex-col items-center p-2.5 sm:p-3 bg-white border border-slate-200 rounded-md w-full max-w-[440px]">
                        <img
                          src={buildDiagramSvgDataUrl(q)}
                          alt={`Figure for Q${qNum}`}
                          referrerPolicy="no-referrer"
                          className="w-full max-w-[380px] h-auto object-contain"
                        />
                        <span className="mt-1.5 text-[11px] italic text-slate-600">
                          Fig. Q{qNum}
                        </span>
                      </div>
                    )}

                    {/* MCQ Options (Student-safe: never highlights the answer in student mode) */}
                    {q.type === "mcq" && q.options && viewMode === "student" && (
                      <div className="mt-2 ml-3 sm:ml-6 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-800">
                        {q.options.map((opt, oIdx) => {
                          const letter = String.fromCharCode(65 + oIdx);
                          const cleaned = opt.replace(/^[A-F][.)]\s*/i, "");
                          return (
                            <div key={oIdx} className="flex items-start gap-1.5 break-words">
                              <span className="font-semibold shrink-0">{letter}.</span>
                              <span className="min-w-0">{cleaned}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Confidential Answer Key Details (Only shown in Answer Key mode) */}
                    {viewMode === "answer_key" && (
                      <div className="mt-2.5 ml-0 sm:ml-6 p-3 bg-emerald-50/70 border border-emerald-200 rounded text-xs space-y-1.5 break-words">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-600">
                          <span>Topic: {q.topic}</span>
                          <span aria-hidden="true">·</span>
                          <span>Difficulty: {q.difficulty}</span>
                        </div>
                        <p className="text-emerald-950 font-semibold">
                          Correct Answer:{" "}
                          <span className="font-mono">
                            {q.correct_answer || "See marking steps below"}
                          </span>
                        </p>
                        {(q.solution || q.required_calculation) && (
                          <p className="text-slate-700 leading-relaxed">
                            <span className="font-semibold text-slate-900">
                              Marking Scheme / Solution:{" "}
                            </span>
                            {q.solution || q.required_calculation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 sm:mt-10 pt-3 border-t border-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 text-[11px] text-slate-500 tabular-nums">
        <span>
          {viewMode === "answer_key"
            ? "CONFIDENTIAL — FOR EXAMINER USE ONLY"
            : template.footerNote || "All the Best"}
        </span>
        <span>Page 1 of 1 · A4 Printable Layout ({template.templateName})</span>
      </div>
    </div>
  );
};
