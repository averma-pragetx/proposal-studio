import { Download, Loader2 } from "lucide-react";

export function ExportCard({
  title,
  description,
  loading,
  onClick,
}: {
  title: string;
  description: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="group flex flex-col items-start gap-2 rounded-md border border-border bg-card p-5 text-left transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-60"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
      </div>
      <p className="font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}
