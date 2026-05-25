import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  extractFindings,
  generateProposal,
  editProposal,
  type FindingsResponse,
  type Finding,
} from "@/lib/api";
import { extractTextFromFile, exportProposalDocx, exportProposalPdf } from "@/lib/document-tools";

export function useProposalStudio() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState("");

  const [analysing, setAnalysing] = useState(false);
  const [findings, setFindings] = useState<FindingsResponse | null>(null);

  const [generating, setGenerating] = useState(false);
  const [proposal, setProposal] = useState("");
  const [editing, setEditing] = useState(false);
  const [editHistory, setEditHistory] = useState<{ query: string }[]>([]);

  const [exporting, setExporting] = useState<null | "docx" | "pdf">(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  const reset = useCallback(() => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setStep(1);
    setFile(null);
    setFileUrl(null);
    setExtractedText("");
    setFindings(null);
    setProposal("");
    setEditHistory([]);
  }, [fileUrl]);

  const handleFile = useCallback(
    (f: File) => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      setFile(f);
      setFileUrl(URL.createObjectURL(f));
      setExtractedText("");
      setFindings(null);
      setProposal("");
      setEditHistory([]);
    },
    [fileUrl],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleExtractText = async () => {
    if (!file) return;
    setExtracting(true);
    try {
      const text = await extractTextFromFile(file);
      if (!text || text.trim().length < 50) {
        throw new Error("We couldn't extract enough text. Is the PDF scanned (image-only)?");
      }
      setExtractedText(text);
      toast.success(`Extracted ${text.length.toLocaleString()} characters`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to read document");
    } finally {
      setExtracting(false);
    }
  };

  const handleGenerateFindings = async () => {
    if (!extractedText) return;
    setAnalysing(true);
    try {
      const result = await extractFindings({ text: extractedText });
      setFindings(result);
      toast.success("Key findings extracted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to extract findings");
    } finally {
      setAnalysing(false);
    }
  };

  const handleGenerateProposal = async () => {
    if (!findings) return;
    setGenerating(true);
    try {
      const { markdown } = await generateProposal({ findings });
      setProposal(markdown);
      setEditHistory([]);
      toast.success("Proposal draft ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate proposal");
    } finally {
      setGenerating(false);
    }
  };

  const handleEditProposal = async (query: string) => {
    if (!proposal || !query.trim()) return;
    setEditing(true);
    try {
      const { markdown } = await editProposal({ proposal, query, history: editHistory });
      setProposal(markdown);
      setEditHistory((prev) => [...prev, { query }]);
      toast.success("Draft updated via AI");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to edit proposal");
    } finally {
      setEditing(false);
    }
  };

  const handleExport = async (kind: "docx" | "pdf") => {
    if (!findings || !proposal) return;
    setExporting(kind);
    try {
      const title = findings.project_title || "Proposal";
      if (kind === "docx") await exportProposalDocx(title, proposal);
      else await exportProposalPdf(title, proposal);
      toast.success(`Exported ${kind.toUpperCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const updateFinding = (i: number, patch: Partial<Finding>) => {
    if (!findings) return;
    const next = [...findings.findings];
    next[i] = { ...next[i], ...patch };
    setFindings({ ...findings, findings: next });
  };

  const removeFinding = (i: number) => {
    if (!findings) return;
    setFindings({ ...findings, findings: findings.findings.filter((_, idx) => idx !== i) });
  };

  const addFinding = () => {
    if (!findings) return;
    setFindings({
      ...findings,
      findings: [
        ...findings.findings,
        { category: "Other", title: "", detail: "", source_excerpt: "" },
      ],
    });
  };

  return {
    step,
    setStep,
    file,
    fileUrl,
    extracting,
    extractedText,
    analysing,
    findings,
    setFindings,
    generating,
    proposal,
    setProposal,
    editing,
    editHistory,
    setEditHistory,
    handleEditProposal,
    exporting,
    inputRef,
    reset,
    handleFile,
    onDrop,
    handleExtractText,
    handleGenerateFindings,
    handleGenerateProposal,
    handleExport,
    updateFinding,
    removeFinding,
    addFinding,
  };
}
