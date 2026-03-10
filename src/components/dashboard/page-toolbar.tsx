import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageToolbarProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageToolbar({ title, description, actions, className }: PageToolbarProps) {
  return (
    <div
      className={cn(
        "sticky top-2 z-10 -mx-1 rounded-lg border bg-background/95 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
