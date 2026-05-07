import { CheckCircle2, Circle, Clock, XCircle } from "lucide-react";

export type StepState = "pending" | "in_progress" | "complete" | "failed";

export function StepIcon({ state }: { state: StepState }) {
  switch (state) {
    case "complete":
      return <CheckCircle2 className="text-success-9 h-5 w-5 shrink-0" />;
    case "in_progress":
      return <Clock className="text-primary h-5 w-5 shrink-0 animate-pulse" />;
    case "failed":
      return <XCircle className="text-destructive h-5 w-5 shrink-0" />;
    default:
      return <Circle className="text-muted-foreground/40 h-5 w-5 shrink-0" />;
  }
}
