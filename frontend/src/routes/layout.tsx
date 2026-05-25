import { Outlet, useNavigate } from "react-router-dom";
import { Sparkles, RefreshCw, FileUp, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/proposal-studio/stepper";
import { useProposalStudioContext } from "@/contexts/ProposalStudioContext";

const STEPS = [
  { id: 1, label: "Upload", icon: FileUp, path: "/upload" },
  { id: 2, label: "Findings", icon: FileText, path: "/findings" },
  { id: 3, label: "Generate", icon: Sparkles, path: "/generate" },
  { id: 4, label: "Export", icon: Download, path: "/export" },
] as const;

export default function Layout() {
  const { step, reset } = useProposalStudioContext();
  const navigate = useNavigate();

  const handleReset = () => {
    reset();
    navigate("/upload");
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
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Start over
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Stepper current={step} steps={STEPS} />

        <div className="mt-8 space-y-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
