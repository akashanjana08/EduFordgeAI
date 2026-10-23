import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  Save,
  Sparkles,
} from "lucide-react";
import { Question, QuestionType, ValidationResult } from "../types";
import { buildDiagramSvgDataUrl } from "../services/diagramRenderer";

interface QuestionsEditorTabProps {
  questions: Question[];
  validation: ValidationResult;
  isGenerating: boolean;
  regeneratingId: string | null;
  onRegenerateAll: () => void;
  onRegenerateSingle: (question: Question) => void;
  onUpdateQuestion: (updated: Question) => void;
  onDeleteQuestion: (id: string) => void;
  onAddManualQuestion: (newQ: Omit<Question, "id">) => void;
}

export const QuestionsEditorTab: React.FC<QuestionsEditorTabProps> = ({
  questions,
  validation,
  isGenerating,
  regeneratingId,
  onRegenerateAll,
  onRegenerateSingle,
  onUpdateQuestion,
  onDeleteQuestion,
  onAddManualQuestion,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Question | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [manualType, setManualType] = useState<QuestionType>("mcq");
  const [manualQuestion, setManualQuestion] = useState("");
  const [manualMarks, setManualMarks] = useState(1);
  const [manualDifficulty, setManualDifficulty] = useState<
    "Easy" | "Moderate" | "Difficult"
  >("Moderate");
  const [manualTopic, setManualTopic] = useState("Real Numbers");
  const [manualOptions, setManualOptions] = useState<string[]>([
    "",
    "",
    "",
    "",
  ]);
  const [manualAnswer, setManualAnswer] = useState("");
  const [manualSolution, setManualSolution] = useState("");

  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setDraft({
      ...q,
      options: q.options ? [...q.options] : ["", "", "", ""],
    });
  };

  const saveEdit = () => {
    if (!draft) return;
    onUpdateQuestion(draft);
    setEditingId(null);
    setDraft(null);
  };

  const handleCreateManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuestion.trim()) return;
    onAddManualQuestion({
      type: manualType,
      question: manualQuestion.trim(),
      marks: Number(manualMarks) || 1,
      difficulty: manualDifficulty,
      topic: manualTopic.trim() || "General",
      options:
        manualType === "mcq"
          ? manualOptions.map((o, i) => o.trim() || `Option ${i + 1}`)
          : undefined,
      correct_answer: manualAnswer.trim() || "See marking scheme",
      solution: manualSolution.trim() || "Award full marks for complete steps.",
    });
    setManualQuestion("");
    setManualAnswer("");
    setManualSolution("");
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* 5-Check Validation Summary Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Application-Side Question &amp; Marks Validation
            </h2>
            <p className="text-xs text-slate-600">
              All 5 checks must pass before final A4 PDF generation is unlocked.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex-1 sm:flex-initial justify-center inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-md text-xs font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 min-h-[38px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Question Manually</span>
            </button>
            <button
              onClick={onRegenerateAll}
              disabled={isGenerating}
              className="flex-1 sm:flex-initial justify-center inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-md text-xs font-semibold bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white min-h-[38px]"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`}
              />
              <span>Regenerate All</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3">
          {validation.checks.map((chk) => (
            <div
              key={chk.key}
              className={`p-3 rounded-md border ${
                chk.passed
                  ? "bg-emerald-50/60 border-emerald-200 text-emerald-950"
                  : "bg-rose-50/70 border-rose-200 text-rose-950"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                {chk.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>
                  {chk.passed ? "✓" : "✗"} {chk.label}
                </span>
              </div>
              <p className="mt-1 text-xs font-mono text-slate-600 tabular-nums">
                {chk.detail}
              </p>
            </div>
          ))}
        </div>

        {validation.errors.length > 0 && (
          <div className="mt-4 p-3.5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
            <p className="font-semibold">Validation Errors Blocking Final PDF:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {validation.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Manual Question Addition Panel */}
      {showAddForm && (
        <form
          onSubmit={handleCreateManual}
          className="bg-white border border-sky-200 rounded-lg p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Add Custom Question Manually
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Question Type
              </label>
              <select
                value={manualType}
                onChange={(e) => setManualType(e.target.value as QuestionType)}
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs"
              >
                <option value="mcq">MCQ</option>
                <option value="subjective">Subjective</option>
                <option value="numeric">Numeric</option>
                <option value="diagram">Diagram</option>
                <option value="derivation">Derivation</option>
                <option value="application">Application</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Marks
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={manualMarks}
                onChange={(e) => setManualMarks(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Difficulty
              </label>
              <select
                value={manualDifficulty}
                onChange={(e) =>
                  setManualDifficulty(
                    e.target.value as "Easy" | "Moderate" | "Difficult"
                  )
                }
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs"
              >
                <option value="Easy">Easy</option>
                <option value="Moderate">Moderate</option>
                <option value="Difficult">Difficult</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Topic / Chapter
              </label>
              <input
                type="text"
                value={manualTopic}
                onChange={(e) => setManualTopic(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Question Statement *
            </label>
            <textarea
              required
              rows={2}
              value={manualQuestion}
              onChange={(e) => setManualQuestion(e.target.value)}
              placeholder="Enter the complete question text..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
            />
          </div>

          {manualType === "mcq" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {manualOptions.map((opt, idx) => (
                <input
                  key={idx}
                  type="text"
                  placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                  value={opt}
                  onChange={(e) => {
                    const next = [...manualOptions];
                    next[idx] = e.target.value;
                    setManualOptions(next);
                  }}
                  className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Correct Answer (For Answer Key Only)
              </label>
              <input
                type="text"
                value={manualAnswer}
                onChange={(e) => setManualAnswer(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Solution / Marking Scheme
              </label>
              <input
                type="text"
                value={manualSolution}
                onChange={(e) => setManualSolution(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              Append Question to Paper
            </button>
          </div>
        </form>
      )}

      {/* Question Cards List */}
      <div className="space-y-3">
        {questions.map((q) => {
          const isEditing = editingId === q.id && draft !== null;
          const isRegenThis = regeneratingId === q.id;

          return (
            <div
              key={q.id}
              className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs transition-colors hover:border-slate-300"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 mb-2.5 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span className="font-mono font-bold text-slate-900">
                    {q.id}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="uppercase font-semibold text-sky-700">
                    {q.type}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="font-mono font-semibold text-slate-800 tabular-nums">
                    {q.marks} {q.marks === 1 ? "Mark" : "Marks"}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-600">{q.difficulty}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-500">Topic: {q.topic}</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => onRegenerateSingle(q)}
                    disabled={isRegenThis || isGenerating}
                    title={`Regenerate only ${q.id} (Cost-Controlled single call)`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:py-1 rounded text-xs font-medium border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-50 min-h-[34px] sm:min-h-0"
                  >
                    <Sparkles
                      className={`w-3.5 h-3.5 text-sky-600 ${
                        isRegenThis ? "animate-spin" : ""
                      }`}
                    />
                    <span>
                      {isRegenThis ? "Regenerating..." : `Regenerate ${q.id}`}
                    </span>
                  </button>
                  {!isEditing ? (
                    <button
                      onClick={() => startEdit(q)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:py-1 rounded text-xs font-medium border border-slate-200 hover:bg-slate-50 text-slate-700 min-h-[34px] sm:min-h-0"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  ) : (
                    <button
                      onClick={saveEdit}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:py-1 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white min-h-[34px] sm:min-h-0"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteQuestion(q.id)}
                    className="inline-flex items-center gap-1 px-2 py-1.5 sm:py-1 rounded text-xs text-rose-600 hover:bg-rose-50 min-h-[34px] sm:min-h-0"
                    aria-label={`Delete ${q.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {isEditing && draft ? (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Question Stem
                    </label>
                    <textarea
                      rows={2}
                      value={draft.question}
                      onChange={(e) =>
                        setDraft({ ...draft, question: e.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Marks
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={draft.marks}
                        onChange={(e) =>
                          setDraft({ ...draft, marks: Number(e.target.value) })
                        }
                        className="w-full rounded-md border border-slate-300 px-2.5 py-1 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Topic
                      </label>
                      <input
                        type="text"
                        value={draft.topic}
                        onChange={(e) =>
                          setDraft({ ...draft, topic: e.target.value })
                        }
                        className="w-full rounded-md border border-slate-300 px-2.5 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Correct Answer (Hidden from Student Paper)
                      </label>
                      <input
                        type="text"
                        value={draft.correct_answer || ""}
                        onChange={(e) =>
                          setDraft({ ...draft, correct_answer: e.target.value })
                        }
                        className="w-full rounded-md border border-slate-300 px-2.5 py-1 text-xs"
                      />
                    </div>
                  </div>
                  {draft.type === "mcq" && draft.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {draft.options.map((opt, oIdx) => (
                        <input
                          key={oIdx}
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const updatedOpts = [...(draft.options || [])];
                            updatedOpts[oIdx] = e.target.value;
                            setDraft({ ...draft, options: updatedOpts });
                          }}
                          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs"
                        />
                      ))}
                    </div>
                  )}
                  {draft.type === "diagram" && (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Diagram / Figure Specification
                      </label>
                      <input
                        type="text"
                        value={draft.diagram_description || ""}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            diagram_description: e.target.value,
                          })
                        }
                        placeholder="e.g. Right-angled inclined plane with block m and force vectors N, mg, f"
                        className="w-full rounded-md border border-slate-300 px-2.5 py-1 text-xs"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Detailed Solution / Marking Rubric
                    </label>
                    <textarea
                      rows={2}
                      value={draft.solution || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, solution: e.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-slate-900 leading-relaxed">
                    {q.question}
                  </p>

                  {q.type === "diagram" && (
                    <div className="p-3 rounded-md bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                      <img
                        src={buildDiagramSvgDataUrl(q)}
                        alt={`Diagram for ${q.id}`}
                        referrerPolicy="no-referrer"
                        className="w-full sm:w-64 h-auto rounded border border-slate-200 bg-white p-1 shrink-0"
                      />
                      <div className="text-xs text-slate-700 space-y-1">
                        <p className="font-semibold text-slate-900">
                          Rendered Examination Diagram ({q.id})
                        </p>
                        {q.diagram_description && (
                          <p className="text-slate-600">
                            <span className="font-medium text-slate-800">
                              Figure Spec:{" "}
                            </span>
                            {q.diagram_description}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {q.type === "mcq" && q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-xs text-slate-700">
                      {q.options.map((opt, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="font-mono font-semibold text-slate-900">
                            {String.fromCharCode(65 + idx)}.
                          </span>
                          <span>{opt.replace(/^[A-F][.)]\s*/i, "")}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 mt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5 sm:gap-2 text-xs text-slate-600">
                    <div className="break-words">
                      <span className="font-semibold text-emerald-800">
                        Answer Key (Internal Only):{" "}
                      </span>
                      <span className="font-mono text-slate-900">
                        {q.correct_answer || "See solution"}
                      </span>
                    </div>
                    {q.solution && (
                      <p className="text-slate-500 max-w-full sm:max-w-2xl break-words sm:truncate">
                        <span className="font-medium text-slate-700">
                          Solution:{" "}
                        </span>
                        {q.solution}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
