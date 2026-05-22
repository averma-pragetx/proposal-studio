import { useNavigate } from "react-router-dom";
import { PreviewStep } from "@/components/proposal-studio/preview-step";
import { useProposalStudioContext } from "@/contexts/ProposalStudioContext";
import { useEffect } from "react";

export default function PreviewPage() {
  const {
    proposal,
    setProposal,
    setStep,
  } = useProposalStudioContext();
  const navigate = useNavigate();

  useEffect(() => {
    setStep(4);
    if (!proposal) {
      navigate("/generate");
    }
  }, [setStep, proposal, navigate]);

  return (
    <PreviewStep
      proposal={proposal}
      setProposal={setProposal}
      onBack={() => navigate("/generate")}
      onNext={() => navigate("/export")}
    />
  );
}
