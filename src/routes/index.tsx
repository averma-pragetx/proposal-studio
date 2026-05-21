import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  FileUp,
  FileText,
  Sparkles,
  Eye,
  Download,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

import { extractFindings, generateProposal, type FindingsResponse, type Finding } from "@/lib/ai.functions";
import { extractTextFromFile, exportProposalDocx, exportProposalPdf } from "@/lib/document-tools";

export const Route = createFileRoute("/")({
  component: ProposalStudio,
  head: () => ({
    meta: [
      { title: "Proposal Studio — AI proposal drafting for engineering & traffic consultancies" },
      {
        name: "description",
        content:
          "Upload a tender or RFP, extract structured findings, and generate an accurate proposal draft. Built for engineering and traffic consulting workflows.",
      },
    ],
  }),
});

const STEPS = [
  { id: 1, label: "Upload", icon: FileUp },
  { id: 2, label: "Findings", icon: FileText },
  { id: 3, label: "Generate", icon: Sparkles },
  { id: 4, label: "Preview", icon: Eye },
  { id: 5, label: "Export", icon: Download },
] as const;

const FINDING_CATEGORIES = [
  "Scope",
  "Objectives",
  "Deliverables",
  "Technical Requirements",
  "Schedule & Milestones",
  "Budget & Commercials",
  "Compliance & Standards",
  "Stakeholders",
  "Risks & Constraints",
  "Submission Requirements",
  "Evaluation Criteria",
  "Other",
];

function ProposalStudio() {
  const extractFn = useServerFn(extractFindings);
  const generateFn = useServerFn(generateProposal);

  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState("");

  const [analysing, setAnalysing] = useState(false);
  const [findings, setFindings] = useState<FindingsResponse | null>(null);

  const [generating, setGenerating] = useState(false);
  const [proposal, setProposal] = useState("");

  const [exporting, setExporting] = useState<null | "docx" | "pdf">(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep(1);
    setFile(null);
    setExtractedText("");
    setFindings(null);
    setProposal("");
  };

  const handleFile = useCallback(
    async (f: File) => {
      setFile(f);
      setExtracting(true);
      try {
        const text = await extractTextFromFile(f);
        if (!text || text.trim().length < 50) {
          throw new Error("We couldn't extract enough text. Is the PDF scanned (image-only)?");
        }
        setExtractedText(text);
        toast.success(`Extracted ${text.length.toLocaleString()} characters from ${f.name}`);

        setAnalysing(true);
        try {
          const result = await extractFn({ data: { text } });
          setFindings(result);
          setStep(2);
          toast.success("Key findings extracted");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to extract findings");
        } finally {
          setAnalysing(false);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to read document");
      } finally {
        setExtracting(false);
      }
    },
    [extractFn],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleGenerate = async () => {
    if (!findings) return;
    setGenerating(true);
    try {
      const { markdown } = await generateFn({ data: { findings } });
      setProposal(markdown);
      setStep(4);
      toast.success("Proposal draft ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate proposal");
    } finally {
      setGenerating(false);
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

  // ---------- Findings editing ----------
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">Proposal Studio</h1>
              <p className="text-xs text-muted-foreground">
                AI-assisted proposal drafting for engineering & traffic consultancies
              </p>
            </div>
          </div>
          {step > 1 && (
            <Button variant="ghost" size="sm" onClick={reset} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Start over
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Stepper current={step} />

        <div className="mt-8 space-y-6">
          {step === 1 && (
            <UploadStep
              extracting={extracting || analysing}
              analysing={analysing}
              file={file}
              inputRef={inputRef}
              onDrop={onDrop}
              onPick={(f) => handleFile(f)}
            />
          )}

          {step === 2 && findings && (
            <FindingsStep
              findings={findings}
              setFindings={setFindings}
              updateFinding={updateFinding}
              removeFinding={removeFinding}
              addFinding={addFinding}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && findings && (
            <GenerateStep
              findings={findings}
              generating={generating}
              onBack={() => setStep(2)}
              onGenerate={handleGenerate}
            />
          )}

          {step === 4 && (
            <PreviewStep
              proposal={proposal}
              setProposal={setProposal}
              onBack={() => setStep(3)}
              onNext={() => setStep(5)}
            />
          )}

          {step === 5 && (
            <ExportStep
              exporting={exporting}
              onExport={handleExport}
              onBack={() => setStep(4)}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// ---------- Stepper ----------

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const isDone = current > s.id;
        const isActive = current === s.id;
        return (
          <li key={s.id} className="flex items-center gap-2">
            <div
              className={
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors " +
                (isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : isDone
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground")
              }
            >
              {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              <span className="font-medium">
                {s.id}. {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}

// ---------- Step 1 ----------

function UploadStep({
  extracting,
  analysing,
  file,
  inputRef,
  onDrop,
  onPick,
}: {
  extracting: boolean;
  analysing: boolean;
  file: File | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onPick: (f: File) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload tender or project document</CardTitle>
        <CardDescription>
          PDF or DOCX, up to ~50 MB. Text is extracted in your browser, then analysed by the AI.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/30 p-12 text-center transition-colors hover:bg-muted/60"
        >
          {extracting ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium">
                {analysing ? "Analysing with Gemini…" : "Reading document…"}
              </p>
              {file && <p className="text-xs text-muted-foreground">{file.name}</p>}
            </>
          ) : (
            <>
              <FileUp className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Drop a file here or click to browse</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Accepted: .pdf, .docx — scanned/image-only PDFs are not supported.
                </p>
              </div>
              <Button type="button" variant="default" size="sm" className="mt-2 gap-2">
                <FileUp className="h-4 w-4" /> Choose file
              </Button>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPick(f);
              e.target.value = "";
            }}
          />
        </div>

        <Alert className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <p className="text-sm font-medium">Accuracy first</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The AI is instructed to never invent facts. Missing information is flagged as
              <span className="font-mono"> "Not specified in document"</span> or
              <span className="font-mono"> [To be confirmed: …]</span>. You can edit every
              finding before drafting.
            </p>
          </div>
        </Alert>
      </CardContent>
    </Card>
  );
}

function Alert({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={
        "flex items-start gap-3 rounded-md border border-border bg-card p-4 " + className
      }
    >
      {children}
    </div>
  );
}

// ---------- Step 2 ----------

function FindingsStep({
  findings,
  setFindings,
  updateFinding,
  removeFinding,
  addFinding,
  onBack,
  onNext,
}: {
  findings: FindingsResponse;
  setFindings: (f: FindingsResponse) => void;
  updateFinding: (i: number, patch: Partial<Finding>) => void;
  removeFinding: (i: number) => void;
  addFinding: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Review & edit key findings</CardTitle>
        <CardDescription>
          Verify every item against the source document. These findings are the sole basis for
          the proposal — edit, delete, or add as needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Project title</Label>
            <Input
              value={findings.project_title}
              onChange={(e) => setFindings({ ...findings, project_title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Client</Label>
            <Input
              value={findings.client}
              onChange={(e) => setFindings({ ...findings, client: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Summary</Label>
          <Textarea
            rows={3}
            value={findings.summary}
            onChange={(e) => setFindings({ ...findings, summary: e.target.value })}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Findings ({findings.findings.length})</h3>
            <p className="text-xs text-muted-foreground">
              Grouped by category. Each item includes a source excerpt for verification.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={addFinding} className="gap-2">
            <Plus className="h-4 w-4" /> Add finding
          </Button>
        </div>

        <div className="space-y-3">
          {findings.findings.map((f, i) => (
            <div key={i} className="rounded-md border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-3">
                  <div className="grid gap-3 md:grid-cols-[200px_1fr]">
                    <Select
                      value={f.category}
                      onValueChange={(v) => updateFinding(i, { category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FINDING_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Short title"
                      value={f.title}
                      onChange={(e) => updateFinding(i, { title: e.target.value })}
                    />
                  </div>
                  <Textarea
                    rows={2}
                    placeholder="Detail"
                    value={f.detail}
                    onChange={(e) => updateFinding(i, { detail: e.target.value })}
                  />
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Source excerpt</Label>
                    <Textarea
                      rows={2}
                      placeholder="Verbatim quote from the document"
                      value={f.source_excerpt ?? ""}
                      onChange={(e) => updateFinding(i, { source_excerpt: e.target.value })}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFinding(i)}
                  aria-label="Remove finding"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {findings.findings.length === 0 && (
            <p className="text-sm text-muted-foreground">No findings yet. Add one to continue.</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button
            onClick={onNext}
            disabled={findings.findings.length === 0}
            className="gap-2"
          >
            Continue to draft <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Step 3 ----------

function GenerateStep({
  findings,
  generating,
  onBack,
  onGenerate,
}: {
  findings: FindingsResponse;
  generating: boolean;
  onBack: () => void;
  onGenerate: () => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, Finding[]>();
    for (const f of findings.findings) {
      const arr = map.get(f.category) ?? [];
      arr.push(f);
      map.set(f.category, arr);
    }
    return Array.from(map.entries());
  }, [findings]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate proposal draft</CardTitle>
        <CardDescription>
          The AI will draft a proposal using only the findings below. Missing data will be flagged
          with bracketed placeholders.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-md border border-border bg-muted/30 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Project
          </p>
          <p className="mt-1 font-semibold">{findings.project_title || "Untitled"}</p>
          <p className="text-sm text-muted-foreground">{findings.client}</p>
          <p className="mt-3 text-sm">{findings.summary}</p>
        </div>

        <div className="space-y-3">
          {grouped.map(([cat, items]) => (
            <div key={cat}>
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="secondary">{cat}</Badge>
                <span className="text-xs text-muted-foreground">{items.length} item(s)</span>
              </div>
              <ul className="ml-4 list-disc space-y-1 text-sm">
                {items.map((f, i) => (
                  <li key={i}>
                    <span className="font-medium">{f.title}</span>
                    {f.detail && <span className="text-muted-foreground"> — {f.detail}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={onBack} disabled={generating} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button onClick={onGenerate} disabled={generating} className="gap-2">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Drafting…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate proposal
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Step 4 ----------

function PreviewStep({
  proposal,
  setProposal,
  onBack,
  onNext,
}: {
  proposal: string;
  setProposal: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Proposal preview</CardTitle>
          <CardDescription>
            Review and edit. Bracketed placeholders are intentional — fill in or remove before
            sending.
          </CardDescription>
        </div>
        <div className="flex gap-1 rounded-md border border-border p-0.5">
          <button
            onClick={() => setMode("preview")}
            className={
              "rounded px-3 py-1 text-xs font-medium transition-colors " +
              (mode === "preview"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted")
            }
          >
            Preview
          </button>
          <button
            onClick={() => setMode("edit")}
            className={
              "rounded px-3 py-1 text-xs font-medium transition-colors " +
              (mode === "edit"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted")
            }
          >
            Edit
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === "preview" ? (
          <div className="max-h-[600px] overflow-y-auto rounded-md border border-border bg-card p-6">
            <MarkdownView source={proposal} />
          </div>
        ) : (
          <Textarea
            rows={24}
            value={proposal}
            onChange={(e) => setProposal(e.target.value)}
            className="font-mono text-sm"
          />
        )}

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button onClick={onNext} className="gap-2">
            Continue to export <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MarkdownView({ source }: { source: string }) {
  // Lightweight renderer for headings, bullets, paragraphs — no external deps.
  const blocks: React.ReactNode[] = [];
  const lines = source.split(/\r?\n/);
  let buf: string[] = [];
  let listBuf: string[] = [];

  const flushPara = () => {
    if (buf.length) {
      blocks.push(
        <p key={blocks.length} className="my-2 leading-relaxed text-foreground">
          {renderInline(buf.join(" "))}
        </p>,
      );
      buf = [];
    }
  };
  const flushList = () => {
    if (listBuf.length) {
      blocks.push(
        <ul key={blocks.length} className="my-2 ml-6 list-disc space-y-1">
          {listBuf.map((li, i) => (
            <li key={i}>{renderInline(li)}</li>
          ))}
        </ul>,
      );
      listBuf = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    if (line.startsWith("### ")) {
      flushPara();
      flushList();
      blocks.push(
        <h3 key={blocks.length} className="mt-4 text-base font-semibold">
          {line.replace(/^###\s+/, "")}
        </h3>,
      );
    } else if (line.startsWith("## ")) {
      flushPara();
      flushList();
      blocks.push(
        <h2 key={blocks.length} className="mt-6 border-b pb-1 text-lg font-semibold">
          {line.replace(/^##\s+/, "")}
        </h2>,
      );
    } else if (line.startsWith("# ")) {
      flushPara();
      flushList();
      blocks.push(
        <h1 key={blocks.length} className="mt-6 text-xl font-bold">
          {line.replace(/^#\s+/, "")}
        </h1>,
      );
    } else if (/^[-*]\s+/.test(line)) {
      flushPara();
      listBuf.push(line.replace(/^[-*]\s+/, ""));
    } else {
      flushList();
      buf.push(line);
    }
  }
  flushPara();
  flushList();
  return <div className="text-sm">{blocks}</div>;
}

function renderInline(s: string): React.ReactNode {
  // bold (**text**) and inline placeholders
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
}

// ---------- Step 5 ----------

function ExportStep({
  exporting,
  onExport,
  onBack,
}: {
  exporting: null | "docx" | "pdf";
  onExport: (kind: "docx" | "pdf") => void;
  onBack: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Export proposal</CardTitle>
        <CardDescription>Download the final draft in your preferred format.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <ExportCard
            title="Microsoft Word (.docx)"
            description="Best for editing, track changes, and team review."
            loading={exporting === "docx"}
            onClick={() => onExport("docx")}
          />
          <ExportCard
            title="PDF (.pdf)"
            description="Best for client delivery and submission portals."
            loading={exporting === "pdf"}
            onClick={() => onExport("pdf")}
          />
        </div>
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ExportCard({
  title,
  description,
  loading,
  onClick,
}: {
  title: string;
  description: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="group flex flex-col items-start gap-2 rounded-md border border-border bg-card p-5 text-left transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-60"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
      </div>
      <p className="font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}
