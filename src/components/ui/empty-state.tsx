import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center sm:px-6",
        className
      )}
    >
      {icon ? (
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-background text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold tracking-tight sm:text-lg">{title}</h3>
      {description ? <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{description}</p> : null}
      {primaryAction || secondaryAction ? (
        <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
          {primaryAction}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
