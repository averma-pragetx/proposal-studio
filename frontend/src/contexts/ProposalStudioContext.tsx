import React, { createContext, useContext, ReactNode } from "react";
import { useProposalStudio } from "@/hooks/use-proposal-studio";

type ProposalStudioContextType = ReturnType<typeof useProposalStudio>;

const ProposalStudioContext = createContext<ProposalStudioContextType | null>(null);

export function ProposalStudioProvider({ children }: { children: ReactNode }) {
  const value = useProposalStudio();
  return (
    <ProposalStudioContext.Provider value={value}>
      {children}
    </ProposalStudioContext.Provider>
  );
}

export function useProposalStudioContext() {
  const context = useContext(ProposalStudioContext);
  if (!context) {
    throw new Error("useProposalStudioContext must be used within a ProposalStudioProvider");
  }
  return context;
}
