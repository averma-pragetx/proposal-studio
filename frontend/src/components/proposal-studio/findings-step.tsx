import { Loader2, Sparkles, Plus, Trash2, ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type FindingsResponse, type Finding } from "@/lib/api";

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

interface FindingsStepProps {
  extractedText: string;
  findings: FindingsResponse | null;
  analysing: boolean;
  onGenerateFindings: () => void;
  setFindings: (f: FindingsResponse) => void;
  updateFinding: (i: number, patch: Partial<Finding>) => void;
  removeFinding: (i: number) => void;
  addFinding: () => void;
  onBack: () => void;
  onNext: () => void;
}

export function FindingsStep({
  extractedText,
  findings,
  analysing,
  onGenerateFindings,
  setFindings,
  updateFinding,
  removeFinding,
  addFinding,
  onBack,
  onNext,
}: FindingsStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Key findings</CardTitle>
        <CardDescription>
          Generate structured findings from the extracted text, review and edit
          each item. These findings are the sole basis for the proposal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            {extractedText
              ? `${extractedText.length.toLocaleString()} characters of source text available`
              : "No extracted text — go back and extract first."}
          </p>
          <Button
            size="sm"
            onClick={onGenerateFindings}
            disabled={!extractedText || analysing}
            className="gap-2"
          >
            {analysing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Analysing…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {findings ? "Re-generate findings" : "Generate findings"}
              </>
            )}
          </Button>
        </div>

        {!findings ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20 p-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">No findings yet</p>
            <p className="text-xs text-muted-foreground">
              Click <strong>Generate findings</strong> to analyse the document.
            </p>
          </div>
        ) : (
          <>
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
          </>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button
            onClick={onNext}
            disabled={!findings || findings.findings.length === 0}
            className="gap-2"
          >
            Continue to draft <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
