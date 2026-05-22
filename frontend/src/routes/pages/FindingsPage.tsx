import { useNavigate } from "react-router-dom";
import { FindingsStep } from "@/components/proposal-studio/findings-step";
import { useProposalStudioContext } from "@/contexts/ProposalStudioContext";
import { useEffect } from "react";

export default function FindingsPage() {
  const {
    extractedText,
    findings,
    analysing,
    handleGenerateFindings,
    setFindings,
    updateFinding,
    removeFinding,
    addFinding,
    setStep,
  } = useProposalStudioContext();
  const navigate = useNavigate();

  useEffect(() => {
    setStep(2);
    if (!extractedText) {
      navigate("/");
    }
  }, [setStep, extractedText, navigate]);

  return (
    <FindingsStep
      extractedText={extractedText}
      findings={findings}
      analysing={analysing}
      onGenerateFindings={handleGenerateFindings}
      setFindings={setFindings}
      updateFinding={updateFinding}
      removeFinding={removeFinding}
      addFinding={addFinding}
      onBack={() => navigate("/")}
      onNext={() => navigate("/generate")}
    />
  );
}
