import React, { useEffect, useState } from "react";
import { Code2, Copy, Check, Download, X } from "lucide-react";

interface PythonSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PythonSourceModal: React.FC<PythonSourceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [files, setFiles] = useState<Record<string, string>>({});
  const [selectedPath, setSelectedPath] = useState<string>("app/app.py");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || Object.keys(files).length > 0) return;
    setLoading(true);
    fetch("/api/python-project")
      .then((res) => res.json())
      .then((data) => {
        if (data.files) {
          setFiles(data.files);
          const keys = Object.keys(data.files);
          if (keys.length > 0 && !data.files[selectedPath]) {
            setSelectedPath(keys[0]);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, files, selectedPath]);

  if (!isOpen) return null;

  const currentCode = files[selectedPath] || "";

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([currentCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedPath.split("/").pop() || "file.py";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-lg shadow-xl w-full max-w-5xl h-[92vh] sm:h-[85vh] flex flex-col overflow-hidden">
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-900 text-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <Code2 className="w-5 h-5 text-sky-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-semibold truncate">
                Python &amp; Streamlit Production Source Code (`app/`)
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Complete service-oriented Python codebase, Dockerfile, Pydantic models &amp; pytest suite
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-md shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile File Selector Dropdown (< 768px) */}
        <div className="md:hidden px-4 py-2.5 bg-slate-100 border-b border-slate-200">
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Select Project File ({Object.keys(files).length} files)
          </label>
          <select
            value={selectedPath}
            onChange={(e) => setSelectedPath(e.target.value)}
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
          >
            {Object.keys(files).map((filePath) => (
              <option key={filePath} value={filePath}>
                {filePath}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          {/* Tablet & Desktop File Tree Sidebar (>= 768px) */}
          <div className="hidden md:block w-60 lg:w-64 border-r border-slate-200 bg-slate-50 overflow-y-auto p-2 space-y-0.5 shrink-0">
            {loading ? (
              <p className="p-3 text-xs text-slate-500">Loading project tree...</p>
            ) : (
              Object.keys(files).map((filePath) => (
                <button
                  key={filePath}
                  onClick={() => setSelectedPath(filePath)}
                  className={`w-full text-left px-2.5 py-2 rounded text-xs font-mono truncate transition-colors ${
                    selectedPath === filePath
                      ? "bg-sky-600 text-white font-medium"
                      : "text-slate-700 hover:bg-slate-200/70"
                  }`}
                >
                  {filePath}
                </button>
              ))
            )}
          </div>

          <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-slate-950 text-slate-100">
            <div className="px-3 sm:px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-900/80">
              <span className="text-xs font-mono text-sky-400 truncate max-w-[200px] sm:max-w-none">
                {selectedPath}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 min-h-[36px]"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownloadFile}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-sky-600 hover:bg-sky-500 text-white min-h-[36px]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>
            <pre className="flex-1 p-3 sm:p-4 overflow-auto text-xs font-mono leading-relaxed text-slate-200">
              <code>{currentCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
