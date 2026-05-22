import { useNavigate } from "react-router-dom";
import { GenerateStep } from "@/components/proposal-studio/generate-step";
import { useProposalStudioContext } from "@/contexts/ProposalStudioContext";
import { useEffect } from "react";

export default function GeneratePage() {
  const {
    findings,
    generating,
    proposal,
    setProposal,
    handleGenerateProposal,
    setStep,
  } = useProposalStudioContext();
  const navigate = useNavigate();

  useEffect(() => {
    setStep(3);
    if (!findings) {
      navigate("/findings");
    }
  }, [setStep, findings, navigate]);

  if (!findings) return null;

  return (
    <GenerateStep
      findings={findings}
      generating={generating}
      proposal={proposal}
      setProposal={setProposal}
      onBack={() => navigate("/findings")}
      onGenerate={handleGenerateProposal}
      onNext={() => navigate("/preview")}
    />
  );
}
