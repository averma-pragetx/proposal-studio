import { CheckCircle2, LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

export type Step = {
  id: number;
  label: string;
  icon: LucideIcon;
  path: string;
};

interface StepperProps {
  current: number;
  steps: readonly Step[];
}

export function Stepper({ current, steps }: StepperProps) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto pb-2">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const isDone = current > s.id;
        const isActive = current === s.id;
        
        return (
          <li key={s.id} className="flex items-center gap-2">
            <Link
              to={s.path}
              className={
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors hover:opacity-80 " +
                (isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : isDone
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground")
              }
            >
              {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              <span className="font-medium">
                {s.id}. {s.label}
              </span>
            </Link>
            {i < steps.length - 1 && <span className="h-px w-6 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}
