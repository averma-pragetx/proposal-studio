import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownView } from "./markdown-view";

interface PreviewStepProps {
  proposal: string;
  setProposal: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function PreviewStep({
  proposal,
  setProposal,
  onBack,
  onNext,
}: PreviewStepProps) {
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
