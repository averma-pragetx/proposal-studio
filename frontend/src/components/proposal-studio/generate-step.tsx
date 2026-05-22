import { useMemo } from "react";
import { Loader2, Sparkles, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { type FindingsResponse, type Finding } from "@/lib/api";

interface GenerateStepProps {
  findings: FindingsResponse;
  generating: boolean;
  proposal: string;
  setProposal: (v: string) => void;
  onBack: () => void;
  onGenerate: () => void;
  onNext: () => void;
}

export function GenerateStep({
  findings,
  generating,
  proposal,
  setProposal,
  onBack,
  onGenerate,
  onNext,
}: GenerateStepProps) {
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
          The AI will draft a proposal using only the findings below. The draft is fully editable
          before you continue.
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

        {!proposal && (
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
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            {proposal
              ? `Draft ready — ${proposal.length.toLocaleString()} characters. Edit below as needed.`
              : "Click generate to draft the proposal from the findings above."}
          </p>
          <Button onClick={onGenerate} disabled={generating} className="gap-2">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Drafting…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {proposal ? "Re-generate draft" : "Generate proposal"}
              </>
            )}
          </Button>
        </div>

        {proposal && (
          <div className="space-y-2">
            <Label>Proposal draft (Markdown — editable)</Label>
            <Textarea
              rows={22}
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={onBack} disabled={generating} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button onClick={onNext} disabled={!proposal} className="gap-2">
            Continue to preview <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
