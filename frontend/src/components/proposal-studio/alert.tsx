import React from "react";

export function Alert({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={
        "flex items-start gap-3 rounded-md border border-border bg-card p-4 " + className
      }
    >
      {children}
    </div>
  );
}
