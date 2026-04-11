"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SearchResultItemProps {
  icon: ReactNode;
  title: string;
  description?: string | undefined;
  metadata?: string | undefined;
  isHighlighted?: boolean | undefined;
  onClick?: (() => void) | undefined;
}

export function SearchResultItem({
  icon,
  title,
  description,
  metadata,
  isHighlighted,
  onClick,
}: SearchResultItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
        isHighlighted ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
      )}
    >
      <div className="mt-0.5 flex-shrink-0 text-lg">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{title}</p>
        {description && (
          <p
            className={cn(
              "truncate text-xs",
              isHighlighted ? "text-primary-foreground/80" : "text-muted-foreground"
            )}
          >
            {description}
          </p>
        )}
        {metadata && (
          <p
            className={cn(
              "mt-0.5 text-xs",
              isHighlighted ? "text-primary-foreground/60" : "text-muted-foreground"
            )}
          >
            {metadata}
          </p>
        )}
      </div>
    </button>
  );
}
