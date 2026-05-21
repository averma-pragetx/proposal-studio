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
  const mammoth = await import("mammoth/mammoth.browser");
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return (result.value ?? "").trim();
}

// ---------- Exports ----------

export async function exportProposalDocx(title: string, markdown: string) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import("docx");

  const children: InstanceType<typeof Paragraph>[] = [];
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text: title, bold: true })],
    }),
  );

  const lines = markdown.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      children.push(new Paragraph({ children: [new TextRun("")] }));
      continue;
    }
    if (line.startsWith("### ")) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: line.replace(/^###\s+/, ""), bold: true })],
        }),
      );
    } else if (line.startsWith("## ")) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: line.replace(/^##\s+/, ""), bold: true })],
        }),
      );
    } else if (line.startsWith("# ")) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: line.replace(/^#\s+/, ""), bold: true })],
        }),
      );
    } else if (/^[-*]\s+/.test(line)) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun(line.replace(/^[-*]\s+/, ""))],
        }),
      );
    } else {
      children.push(new Paragraph({ children: [new TextRun(line)] }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${safeName(title)}.docx`);
}

export async function exportProposalPdf(title: string, markdown: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const write = (text: string, size: number, bold: boolean, gap = 6) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    for (const line of lines) {
      if (y + size + 2 > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += size + 2;
    }
    y += gap;
  };

  write(title, 18, true, 12);
  const lines = markdown.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      y += 6;
      continue;
    }
    if (line.startsWith("### ")) write(line.replace(/^###\s+/, ""), 12, true, 4);
    else if (line.startsWith("## ")) write(line.replace(/^##\s+/, ""), 14, true, 6);
    else if (line.startsWith("# ")) write(line.replace(/^#\s+/, ""), 16, true, 8);
    else if (/^[-*]\s+/.test(line)) write("•  " + line.replace(/^[-*]\s+/, ""), 11, false, 2);
    else write(line, 11, false, 2);
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
