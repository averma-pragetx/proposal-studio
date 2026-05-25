// Client-only helpers for parsing documents and exporting proposals.
// All imports here are dynamic so server bundles never touch them.

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return extractPdf(file);
  }
  if (
    name.endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractDocx(file);
  }
  throw new Error("Unsupported file type. Please upload a PDF or DOCX file.");
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it: unknown) => {
        const item = it as { str?: string };
        return item.str ?? "";
      })
      .join(" ");
    pages.push(text);
  }
  return pages.join("\n\n").trim();
}

async function extractDocx(file: File): Promise<string> {
  // @ts-expect-error - mammoth browser build has no bundled types
  const mammoth = await import("mammoth/mammoth.browser");
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return (result.value ?? "").trim();
}

// ---------- Exports ----------

export async function exportProposalDocx(title: string, markdown: string) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    Header,
    Footer,
    PageNumber,
    BorderStyle,
  } = await import("docx");

  const children: any[] = [];

  const parseInline = (text: string, size: number, color?: string, bold = false) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts
      .filter((p) => p.length > 0)
      .map((part) => {
        const isBold = part.startsWith("**") && part.endsWith("**");
        const content = isBold ? part.slice(2, -2) : part;
        return new TextRun({
          text: content,
          bold: isBold || bold,
          size,
          color,
          font: "Helvetica",
        });
      });
  };

  // Title Section
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 48, // 24pt
          color: "1e40af",
          font: "Helvetica",
        }),
      ],
    }),
  );

  const lines = markdown.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      continue;
    }

    if (line.startsWith("### ")) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 120 },
          children: parseInline(line.replace(/^###\s+/, ""), 28, "1e3a8a", true),
        }),
      );
    } else if (line.startsWith("## ")) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
          border: {
            bottom: { color: "cbd5e1", space: 1, style: BorderStyle.SINGLE, size: 6 },
          },
          children: parseInline(line.replace(/^##\s+/, ""), 32, "1e40af", true),
        }),
      );
    } else if (line.startsWith("# ")) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 600, after: 300 },
          children: parseInline(line.replace(/^#\s+/, ""), 40, "1e40af", true),
        }),
      );
    } else if (/^[-*]\s+/.test(line)) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 120 },
          children: parseInline(line.replace(/^[-*]\s+/, ""), 22),
        }),
      );
    } else {
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: parseInline(line, 22),
        }),
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                // children: [
                //   new TextRun({
                //     text: "Professional Consultancy Proposal",
                //     color: "94a3b8",
                //     size: 18,
                //   }),
                // ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: `Page `,
                    color: "94a3b8",
                    size: 18,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    color: "94a3b8",
                    size: 18,
                  }),
                  // new TextRun({
                  //   text: " of ",
                  //   color: "94a3b8",
                  //   size: 18,
                  // }),
                  // new TextRun({
                  //   children: [PageNumber.TOTAL_PAGES],
                  //   color: "94a3b8",
                  //   size: 18,
                  // }),
                ],
              }),
            ],
          }),
        },
        children: children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${safeName(title)}.docx`);
}

export async function exportProposalPdf(title: string, markdown: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 72; // 1 inch
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  let pageNum = 1;

  const drawHeader = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // 94a3b8
    // doc.text("Professional Consultancy Proposal", pageWidth - margin, 40, { align: "right" });
  };

  const drawFooter = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // 94a3b8
    doc.text(`Page ${pageNum}`, margin, pageHeight - 40);
  };

  let y = margin;
  drawHeader();
  drawFooter();

  const write = (text: string, size: number, defaultBold: boolean, gap = 12, color = [0, 0, 0], align: "left" | "center" = "left") => {
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);

    const segments = text.split(/(\*\*.*?\*\*)/g).map((p) => {
      if (p.startsWith("**") && p.endsWith("**")) {
        return { text: p.slice(2, -2), bold: true };
      }
      return { text: p, bold: defaultBold };
    }).filter(s => s.text.length > 0);

    const tokens: { text: string; bold: boolean }[] = [];
    segments.forEach((seg) => {
      const parts = seg.text.split(/(\s+)/);
      parts.forEach((p) => {
        if (p.length > 0) tokens.push({ text: p, bold: seg.bold });
      });
    });

    let currentLine: { text: string; bold: boolean }[] = [];
    let currentLineWidth = 0;

    const printLine = (lineParts: { text: string; bold: boolean }[]) => {
      if (y + size + 20 > pageHeight - margin) {
        doc.addPage();
        pageNum++;
        drawHeader();
        drawFooter();
        y = margin;
        doc.setFontSize(size);
        doc.setTextColor(color[0], color[1], color[2]);
      }

      let totalLineWidth = 0;
      if (align === "center") {
        lineParts.forEach(p => {
          doc.setFont("helvetica", p.bold ? "bold" : "normal");
          totalLineWidth += doc.getTextWidth(p.text);
        });
      }

      let x = align === "center" ? (pageWidth - totalLineWidth) / 2 : margin;
      lineParts.forEach((p) => {
        doc.setFont("helvetica", p.bold ? "bold" : "normal");
        doc.text(p.text, x, y);
        x += doc.getTextWidth(p.text);
      });
      y += size * 1.2;
    };

    tokens.forEach((token) => {
      doc.setFont("helvetica", token.bold ? "bold" : "normal");
      const tokenWidth = doc.getTextWidth(token.text);
      const isWhitespace = /^\s+$/.test(token.text);

      if (currentLineWidth + tokenWidth > maxWidth && !isWhitespace) {
        printLine(currentLine);
        currentLine = [];
        currentLineWidth = 0;
      }

      if (currentLineWidth === 0 && isWhitespace) return;
      currentLine.push(token);
      currentLineWidth += tokenWidth;
    });

    if (currentLine.length > 0) {
      printLine(currentLine);
    }

    y += gap;
  };

  // Title - Centered Blue Bold
  write(title, 24, true, 24, [30, 64, 175], "center");

  const lines = markdown.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      continue;
    }

    if (line.startsWith("### ")) {
      write(line.replace(/^###\s+/, ""), 14, true, 8, [30, 58, 138]);
    } else if (line.startsWith("## ")) {
      y += 10;
      // doc.setDrawColor(203, 213, 225);
      // doc.setLineWidth(1);
      // doc.line(margin, y - 5, pageWidth - margin, y - 5);
      write(line.replace(/^##\s+/, ""), 16, true, 12, [30, 64, 175]);
    } else if (line.startsWith("# ")) {
      y += 15;
      write(line.replace(/^#\s+/, ""), 20, true, 14, [30, 64, 175]);
    } else if (/^[-*]\s+/.test(line)) {
      write("•  " + line.replace(/^[-*]\s+/, ""), 11, false, 6);
    } else {
      write(line, 11, false, 6);
    }
  }

  doc.save(`${safeName(title)}.pdf`);
}

function safeName(s: string) {
  return (s || "proposal").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 80) || "proposal";
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
