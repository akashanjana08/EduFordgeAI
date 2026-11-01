export function normalizeCodeForDisplay(code: string): string {
  const normalized = code.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (normalized.includes("\n")) return normalized;

  let result = "";
  let parenDepth = 0;
  let indent = 0;
  let lineHasText = false;

  const flushLine = () => {
    result = result.trimEnd() + "\n";
    lineHasText = false;
  };

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1] || "";
    if (char === "(") parenDepth += 1;
    if (char === ")") parenDepth = Math.max(0, parenDepth - 1);

    if (char === "{") {
      result = result.trimEnd() + " {";
      lineHasText = true;
      flushLine();
      indent += 1;
      continue;
    }
    if (char === "}") {
      if (lineHasText) flushLine();
      indent = Math.max(0, indent - 1);
      result += "    ".repeat(indent) + "}";
      lineHasText = true;
      if (next !== ";" && next !== ",") flushLine();
      continue;
    }
    if (!lineHasText && /\s/.test(char)) continue;
    if (!lineHasText) result += "    ".repeat(indent);
    result += char;
    lineHasText = lineHasText || !/\s/.test(char);
    if (char === ";" && parenDepth === 0) {
      flushLine();
    }
  }
  if (lineHasText) flushLine();

  return result
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
