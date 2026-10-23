import { jsPDF } from "jspdf";
import { QuestionSection, SchoolDetails, TemplateDefinition } from "../types";
import { drawDiagramInPdf } from "./diagramRenderer";

export interface GeneratePdfInput {
  school: SchoolDetails;
  className: string;
  subject: string;
  maximumMarks: number;
  template: TemplateDefinition;
  sections: QuestionSection[];
  resolvedLogoPngDataUrl?: string | null;
  diagramImagesByQuestionId?: Record<string, string>;
}

/**
 * Converts any browser-supported image Data URL (PNG, JPEG, WEBP, SVG)
 * into a clean baseline PNG Data URL for reliable embedding in jsPDF.
 */
export function rasterizeLogoToPngDataUrl(
  logoDataUrl?: string
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (!logoDataUrl || typeof window === "undefined") {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const natW = img.naturalWidth || img.width || 160;
        const natH = img.naturalHeight || img.height || 160;
        const scale = Math.min(1, 600 / Math.max(natW, natH, 1));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(64, Math.round(natW * scale));
        canvas.height = Math.max(64, Math.round(natH * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL("image/png");
        resolve({ dataUrl: pngUrl, width: canvas.width, height: canvas.height });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = logoDataUrl;
  });
}

function drawVectorFallbackCrest(
  doc: jsPDF,
  boxX: number,
  boxY: number,
  boxSize: number
) {
  // Outer rounded badge
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(boxX, boxY, boxSize, boxSize, 2.5, 2.5, "F");

  // Inner shield outline
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(30, 41, 59);
  doc.setLineWidth(0.45);
  doc.roundedRect(
    boxX + 2.2,
    boxY + 2.2,
    boxSize - 4.4,
    boxSize - 4.4,
    1.5,
    1.5,
    "FD"
  );

  // Accent mortarboard diamond
  doc.setFillColor(2, 132, 199);
  const cx = boxX + boxSize / 2;
  const cy = boxY + boxSize * 0.42;
  doc.triangle(cx, cy - 2.6, cx + 3.8, cy, cx, cy + 2.6, "F");
  doc.triangle(cx, cy - 2.6, cx - 3.8, cy, cx, cy + 2.6, "F");

  // Motto bar
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.5);
  doc.setTextColor(248, 250, 252);
  doc.text("ACADEMY", cx, boxY + boxSize - 3.2, { align: "center" });
}

function embedLogoInBox(
  doc: jsPDF,
  school: SchoolDetails,
  resolvedLogoPngDataUrl: string | null | undefined,
  boxX: number,
  boxY: number,
  boxSize: number
) {
  // Subtle frame around logo matching preview sheet
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.roundedRect(boxX, boxY, boxSize, boxSize, 1.5, 1.5, "FD");

  const candidateUrl = resolvedLogoPngDataUrl || school.logoDataUrl || "";
  const isRasterDataUrl = /^data:image\/(png|jpe?g|webp);base64,/i.test(
    candidateUrl
  );

  if (isRasterDataUrl) {
    try {
      let format: "PNG" | "JPEG" | "WEBP" = "PNG";
      if (/^data:image\/jpe?g/i.test(candidateUrl)) {
        format = "JPEG";
      } else if (/^data:image\/webp/i.test(candidateUrl)) {
        format = "WEBP";
      }

      const padding = 1.2;
      const maxInner = boxSize - padding * 2;
      const rawW = school.logoDimensions?.width || 160;
      const rawH = school.logoDimensions?.height || 160;
      const ratio = Math.min(maxInner / rawW, maxInner / rawH);
      const drawW = Math.max(4, rawW * ratio);
      const drawH = Math.max(4, rawH * ratio);
      const drawX = boxX + (boxSize - drawW) / 2;
      const drawY = boxY + (boxSize - drawH) / 2;

      doc.addImage(candidateUrl, format, drawX, drawY, drawW, drawH);
      return;
    } catch {
      // Fall through to vector crest fallback if jsPDF rejects the image encoding
    }
  }

  drawVectorFallbackCrest(doc, boxX + 0.8, boxY + 0.8, boxSize - 1.6);
}

function renderDocumentHeader(params: {
  doc: jsPDF;
  school: SchoolDetails;
  template: TemplateDefinition;
  subtitleText: string;
  resolvedLogoPngDataUrl?: string | null;
  pageWidth: number;
  marginX: number;
  startY: number;
}): number {
  const {
    doc,
    school,
    template,
    subtitleText,
    resolvedLogoPngDataUrl,
    pageWidth,
    marginX,
    startY,
  } = params;

  let y = startY;
  const logoSize = 16; // 16mm x 16mm crest badge

  if (template.logoPosition === "center") {
    const logoX = (pageWidth - logoSize) / 2;
    embedLogoInBox(doc, school, resolvedLogoPngDataUrl, logoX, y - 3, logoSize);
    y += logoSize + 2.5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(
      (school.schoolName || "ABC International School").toUpperCase(),
      pageWidth / 2,
      y,
      { align: "center" }
    );
    y += 5.2;

    if (school.schoolAddress && !template.compactSpacing) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(school.schoolAddress, pageWidth / 2, y, { align: "center" });
      y += 4.8;
    }

    if (subtitleText) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(30, 41, 59);
      doc.text(subtitleText.toUpperCase(), pageWidth / 2, y, {
        align: "center",
      });
      y += 5;
    }
  } else {
    // Left-aligned logo with centered school header text block
    const headerTopY = y - 3;
    embedLogoInBox(
      doc,
      school,
      resolvedLogoPngDataUrl,
      marginX,
      headerTopY,
      logoSize
    );

    let textY = y + 1.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14.5);
    doc.setTextColor(15, 23, 42);
    doc.text(
      (school.schoolName || "ABC International School").toUpperCase(),
      pageWidth / 2,
      textY,
      { align: "center" }
    );
    textY += 5;

    if (school.schoolAddress && !template.compactSpacing) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.8);
      doc.setTextColor(71, 85, 105);
      doc.text(school.schoolAddress, pageWidth / 2, textY, { align: "center" });
      textY += 4.6;
    }

    if (subtitleText) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(subtitleText.toUpperCase(), pageWidth / 2, textY, {
        align: "center",
      });
      textY += 4.8;
    }

    y = Math.max(headerTopY + logoSize + 2.5, textY);
  }

  return y;
}

export function generateStudentQuestionPaperPdf(input: GeneratePdfInput): Blob {
  const {
    school,
    className,
    subject,
    maximumMarks,
    template,
    sections,
    resolvedLogoPngDataUrl,
    diagramImagesByQuestionId,
  } = input;
  const totalMarks = sections.reduce((s, sec) => s + sec.sectionMarks, 0);
  if (totalMarks !== maximumMarks) {
    throw new Error(
      `Cannot generate PDF: Generated total marks (${totalMarks}) != Maximum Marks (${maximumMarks}).`
    );
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 15;
  const usableWidth = pageWidth - marginX * 2;
  let y = 16;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 20) {
      doc.addPage();
      y = 18;
    }
  };

  // 1. School Header + Logo
  const examLine = [school.examName, school.term, school.academicSession]
    .filter(Boolean)
    .join(" — ");

  y = renderDocumentHeader({
    doc,
    school,
    template,
    subtitleText: examLine,
    resolvedLogoPngDataUrl,
    pageWidth,
    marginX,
    startY: y,
  });

  // Divider line
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 5;

  // 2. Metadata Bar
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Class: ${className}`, marginX, y);
  doc.text(`Subject: ${subject}`, pageWidth - marginX, y, { align: "right" });
  y += 5;

  doc.text(`Time: ${school.timeDuration || "3 Hours"}`, marginX, y);
  doc.text(`Maximum Marks: ${maximumMarks}`, pageWidth - marginX, y, {
    align: "right",
  });
  y += 4.5;

  if (school.examDate && !template.compactSpacing) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Date: ${school.examDate}`, marginX, y);
    y += 4;
  }

  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 5;

  // 3. General Instructions
  if (template.instructions.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("General Instructions:", marginX, y);
    y += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.8);
    doc.setTextColor(51, 65, 85);
    template.instructions.forEach((inst, idx) => {
      const wrapped = doc.splitTextToSize(`${idx + 1}. ${inst}`, usableWidth - 4);
      ensureSpace(wrapped.length * 4 + 2);
      doc.text(wrapped, marginX + 2, y);
      y += wrapped.length * 4 + 0.5;
    });
    y += 2;
    doc.setDrawColor(203, 213, 225);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 5;
  }

  // 4. Sections & Questions
  let qCounter = 1;
  for (const section of sections) {
    ensureSpace(16);
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(marginX, y - 4, usableWidth, 7.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(section.name, marginX + 2.5, y + 0.8);
    doc.text(section.marksSummaryLabel, pageWidth - marginX - 2.5, y + 0.8, {
      align: "right",
    });
    y += 6.5;

    if (section.subtitle) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(section.subtitle, marginX, y);
      y += 4.5;
    } else {
      y += 2;
    }

    for (const q of section.questions) {
      const stemText = `Q${qCounter}. ${q.question}`;
      const stemLines = doc.splitTextToSize(stemText, usableWidth - 16);
      const optLinesCount =
        q.type === "mcq" && q.options ? q.options.length * 4.2 : 0;
      const diagHeight = q.type === "diagram" ? 48 : 0;
      const blockHeight = stemLines.length * 4.3 + optLinesCount + diagHeight + 4;

      // Avoid splitting a question across pages
      ensureSpace(blockHeight);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(template.compactSpacing ? 9.2 : 10);
      doc.setTextColor(15, 23, 42);
      doc.text(stemLines, marginX, y);

      doc.setFont("helvetica", "bold");
      doc.text(`[${q.marks}]`, pageWidth - marginX, y, { align: "right" });
      y += stemLines.length * 4.3 + 1.5;

      if (q.type === "diagram") {
        const figW = Math.min(104, usableWidth - 16);
        const figH = 44;
        const figX = marginX + (usableWidth - figW) / 2;
        drawDiagramInPdf({
          doc,
          question: q,
          questionNumber: qCounter,
          boxX: figX,
          boxY: y,
          boxW: figW,
          boxH: figH,
          preRasterizedPng: diagramImagesByQuestionId?.[q.id],
        });
        y += figH + 3.5;
      }

      if (q.type === "mcq" && q.options) {
        const letters = ["A", "B", "C", "D", "E", "F"];
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        q.options.forEach((opt, idx) => {
          const prefix = `${letters[idx] || idx + 1}. `;
          const cleanOpt = opt.replace(/^[A-F][.)]\s*/i, "");
          const optWrapped = doc.splitTextToSize(
            `${prefix}${cleanOpt}`,
            usableWidth - 20
          );
          doc.text(optWrapped, marginX + 6, y);
          y += optWrapped.length * 4 + 0.4;
        });
      }

      y += template.compactSpacing ? 2 : 3.5;
      qCounter++;
    }
    y += 2;
  }

  // 5. Footers & Page Numbers
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(template.footerNote || "All the Best", marginX, pageHeight - 9.5);
    doc.text(
      `Page ${p} of ${pageCount}`,
      pageWidth - marginX,
      pageHeight - 9.5,
      { align: "right" }
    );
  }

  return doc.output("blob");
}

export function generateAnswerKeyPdf(input: GeneratePdfInput): Blob {
  const {
    school,
    className,
    subject,
    maximumMarks,
    template,
    sections,
    resolvedLogoPngDataUrl,
  } = input;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 15;
  const usableWidth = pageWidth - marginX * 2;
  let y = 16;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 20) {
      doc.addPage();
      y = 18;
    }
  };

  y = renderDocumentHeader({
    doc,
    school,
    template,
    subtitleText: `CONFIDENTIAL ANSWER KEY & MARKING SCHEME — ${subject} (${className})`,
    resolvedLogoPngDataUrl,
    pageWidth,
    marginX,
    startY: y,
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Maximum Marks: ${maximumMarks}`, pageWidth / 2, y, { align: "center" });
  y += 4;

  doc.setDrawColor(15, 23, 42);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 6;

  let qCounter = 1;
  for (const section of sections) {
    ensureSpace(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`${section.name} (${section.marksSummaryLabel})`, marginX, y);
    y += 5;

    for (const q of section.questions) {
      const headerLine = `Q${qCounter}. [${q.marks} Mark(s)] · Topic: ${q.topic} · Difficulty: ${q.difficulty}`;
      const ansLines = doc.splitTextToSize(
        `Correct Answer: ${q.correct_answer || "See solution steps"}`,
        usableWidth - 6
      );
      const solLines = doc.splitTextToSize(
        `Solution / Marking Scheme: ${
          q.solution || q.required_calculation || "Award marks for accurate steps."
        }`,
        usableWidth - 6
      );
      const needed = (ansLines.length + solLines.length) * 4.2 + 10;
      ensureSpace(needed);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.2);
      doc.setTextColor(15, 23, 42);
      doc.text(headerLine, marginX, y);
      y += 4.2;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.8);
      doc.setTextColor(5, 150, 105);
      doc.text(ansLines, marginX + 3, y);
      y += ansLines.length * 4 + 0.5;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(solLines, marginX + 3, y);
      y += solLines.length * 4 + 3;

      qCounter++;
    }
    y += 2;
  }

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(203, 213, 225);
    doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "CONFIDENTIAL — FOR EXAMINER USE ONLY",
      marginX,
      pageHeight - 9.5
    );
    doc.text(
      `Page ${p} of ${pageCount}`,
      pageWidth - marginX,
      pageHeight - 9.5,
      { align: "right" }
    );
  }

  return doc.output("blob");
}
