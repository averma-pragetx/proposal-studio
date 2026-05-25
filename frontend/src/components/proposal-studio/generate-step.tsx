import { useMemo, useState } from "react";
import { Loader2, Sparkles, ArrowLeft, ArrowRight, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { type FindingsResponse, type Finding } from "@/lib/api";
import { MarkdownView } from "./markdown-view";

interface GenerateStepProps {
  findings: FindingsResponse;
  generating: boolean;
  proposal: string;
  setProposal: (v: string) => void;
  editing: boolean;
  onEdit: (query: string) => Promise<void>;
  onBack: () => void;
  onGenerate: () => void;
  onNext: () => void;
}

export function GenerateStep({
  findings,
  generating,
  proposal,
  setProposal,
  editing,
  onEdit,
  onBack,
  onGenerate,
  onNext,
}: GenerateStepProps) {
  const [query, setQuery] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, Finding[]>();
    for (const f of findings.findings) {
      const arr = map.get(f.category) ?? [];
      arr.push(f);
      map.set(f.category, arr);
    }
    return Array.from(map.entries());
  }, [findings]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    await onEdit(query);
    setQuery("");
    setIsEditDialogOpen(false);
  };

  return (
    <Card className="max-w-none">
      <CardHeader>
        <CardTitle>Generate proposal draft</CardTitle>
        <CardDescription>
          The AI will draft a proposal using only the findings below. You can edit the markdown
          directly and see the preview in real-time.
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
              ? `Draft ready — ${proposal.length.toLocaleString()} characters. Edit below.`
              : "Click generate to draft the proposal from the findings above."}
          </p>
          <div className="flex items-center gap-2">
            {proposal && (
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2" disabled={editing || generating}>
                    {editing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    Edit with AI
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Iterative AI Editing</DialogTitle>
                    <DialogDescription>
                      Describe the changes you want to make. The AI will refine the existing draft
                      while maintaining its context and your previous requests.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="query">Instructions</Label>
                      <Input
                        id="query"
                        placeholder="e.g., 'Make the executive summary more concise' or 'Add a section about road safety'"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={!query.trim() || editing} className="gap-2">
                        {editing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Applying...
                          </>
                        ) : (
                          "Apply Changes"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            <Button onClick={onGenerate} disabled={generating || editing} className="gap-2">
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
        </div>

        {proposal && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <Label>Markdown Editor</Label>
              <Textarea
                rows={25}
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                className="min-h-[600px] resize-none font-mono text-sm leading-relaxed"
                placeholder="Start typing your proposal here..."
              />
            </div>
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="min-h-[600px] max-h-[600px] overflow-y-auto rounded-md border border-input bg-card p-6 shadow-sm">
                <MarkdownView source={proposal} />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={onBack} disabled={generating || editing} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button onClick={onNext} disabled={!proposal || generating || editing} className="gap-2">
            Continue to export <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
