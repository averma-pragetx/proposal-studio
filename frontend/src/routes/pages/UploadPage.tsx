import { useNavigate } from "react-router-dom";
import { UploadStep } from "@/components/proposal-studio/upload-step";
import { useProposalStudioContext } from "@/contexts/ProposalStudioContext";
import { useEffect } from "react";

export default function UploadPage() {
  const {
    file,
    fileUrl,
    extracting,
    extractedText,
    inputRef,
    onDrop,
    handleFile,
    handleExtractText,
    setStep,
    reset,
  } = useProposalStudioContext();
  const navigate = useNavigate();

  useEffect(() => {
    setStep(1);
  }, [setStep]);

  return (
    <UploadStep
      file={file}
      fileUrl={fileUrl}
      extracting={extracting}
      extractedText={extractedText}
      fileInputRef={inputRef}
      onDrop={onDrop}
      onPick={handleFile}
      onRemove={reset}
      onExtract={handleExtractText}
      onNext={() => navigate("/findings")}
    />
  );
}
