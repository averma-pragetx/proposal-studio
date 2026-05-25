import { useNavigate } from "react-router-dom";
import { ExportStep } from "@/components/proposal-studio/export-step";
import { useProposalStudioContext } from "@/contexts/ProposalStudioContext";
import { useEffect } from "react";

export default function ExportPage() {
  const {
    exporting,
    handleExport,
    setStep,
    proposal,
  } = useProposalStudioContext();
  const navigate = useNavigate();

  useEffect(() => {
    setStep(4);
    if (!proposal) {
      navigate("/generate");
    }
  }, [setStep, proposal, navigate]);

  return (
    <ExportStep
      exporting={exporting}
      onExport={handleExport}
      onBack={() => navigate("/generate")}
    />
  );
}
