import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportCard } from "./export-card";

interface ExportStepProps {
  exporting: null | "docx" | "pdf";
  onExport: (kind: "docx" | "pdf") => void;
  onBack: () => void;
}

export function ExportStep({
  exporting,
  onExport,
  onBack,
}: ExportStepProps) {
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
