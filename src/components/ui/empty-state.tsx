import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Sub-message rendered below description — typically an "empty_why" explanation. */
  whyMessage?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
  /** Override the default bg-background on the icon circle. */
  iconBgClass?: string;
  /** Accepted for backwards-compatibility with admin consumers — currently unused. */
  variant?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  whyMessage,
  primaryAction,
  secondaryAction,
  className,
  iconBgClass,
  variant: _variant,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "bg-muted/20 animate-in fade-in-0 slide-in-from-bottom-2 rounded-lg border border-dashed px-4 py-8 text-center duration-300 sm:px-6",
        className
      )}
    >
      {icon ? (
        <div
          className={cn(
            "text-muted-foreground mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full",
            iconBgClass || "bg-background"
          )}
        >
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold tracking-tight sm:text-lg">{title}</h3>
      {description ? (
        <p className="text-muted-foreground mx-auto mt-2 max-w-xl text-sm">{description}</p>
      ) : null}
      {whyMessage ? (
        <p className="text-muted-foreground/70 mx-auto mt-2 max-w-lg text-xs italic">
          {whyMessage}
        </p>
      ) : null}
      {primaryAction || secondaryAction ? (
        <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
          {primaryAction}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
