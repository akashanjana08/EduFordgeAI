import React from "react";
import { normalizeCodeForDisplay } from "../services/codeFormatting";

interface CodeBlockProps {
  code: string;
  language?: string;
  label?: string;
}

const KEYWORDS = new Set(
  "as async await break case catch class const continue def default delete else export extends finally for from function if import in interface let new of return switch throw try typeof var void while with yield public private protected static this true false null undefined".split(
    " "
  )
);

function highlightLine(line: string, language: string): React.ReactNode[] {
  const languageKeywords = new Set(
    language.toLowerCase() === "python"
      ? "and as assert async await break class continue def del elif else except finally for from global if import in is lambda match nonlocal not or pass raise return try while with yield print range len".split(
          " "
        )
      : language.toLowerCase() === "sql"
      ? "select from where join left right inner outer on group by order having as insert into update delete create table alter null and or not".split(
          " "
        )
      : "function const let var class interface extends implements public private static void int string boolean new return if else for while try catch throw async await import export from true false null undefined".split(
          " "
        )
  );
  const keywords = new Set([...KEYWORDS, ...languageKeywords]);
  const tokens = line.split(/(\b[A-Za-z_$][\w$]*\b|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/.*|#.*)/g);
  return tokens.map((token, index) => {
    if (!token) return null;
    if (token.startsWith("//") || token.startsWith("#")) {
      return <span key={index} className="text-slate-400">{token}</span>;
    }
    if (/^["'`]/.test(token)) {
      return <span key={index} className="text-amber-300">{token}</span>;
    }
    if (keywords.has(token.toLowerCase())) {
      return <span key={index} className="text-sky-300">{token}</span>;
    }
    if (/^\d+(?:\.\d+)?$/.test(token)) {
      return <span key={index} className="text-emerald-300">{token}</span>;
    }
    return <React.Fragment key={index}>{token}</React.Fragment>;
  });
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = "text",
  label,
}) => {
  const lines = normalizeCodeForDisplay(code).split("\n");

  return (
    <div className="overflow-hidden text-sm">
      {label && (
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          {label}{language !== "text" ? ` (${language})` : ""}
        </div>
      )}
      <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-words p-0 pl-4 font-mono leading-5 text-black">
        {lines.map((line, index) => (
          <React.Fragment key={index}>
            {highlightLine(line, language)}
            {index < lines.length - 1 ? "\n" : null}
          </React.Fragment>
        ))}
      </pre>
      </div>
  );
};
