"use client";

import { Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type XSubscriptionTier } from "@/components/ui/x-subscription-badge";
import { type AiLengthOptionId } from "@/lib/schemas/common";
import { canPostLongContent } from "@/lib/services/x-subscription";
import { cn } from "@/lib/utils";
import { AI_LENGTH_OPTIONS } from "@/lib/x-post-length";

interface AiLengthSelectorProps {
  selectedLength: AiLengthOptionId;
  onLengthChange: (length: AiLengthOptionId) => void;
  xSubscriptionTier: XSubscriptionTier | null | undefined;
}

/**
 * Segmented control for AI generation length options.
 * Premium users see all three (Short / Medium / Long).
 * Free users see only Short enabled — Medium and Long are visible but disabled
 * with a lock icon, signaling the capability exists behind X Premium.
 */
export function AiLengthSelector({
  selectedLength,
  onLengthChange,
  xSubscriptionTier,
}: AiLengthSelectorProps) {
  const isPremium = canPostLongContent(xSubscriptionTier);
  const options = Object.values(AI_LENGTH_OPTIONS);

  return (
    <div className="space-y-2">
      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center sm:gap-0">
        <span className="text-sm font-medium">Post Length</span>
        <span className="text-muted-foreground truncate text-xs">
          {AI_LENGTH_OPTIONS[selectedLength].description}
        </span>
      </div>

      <div className="bg-muted/50 grid grid-cols-3 gap-1 rounded-lg border p-1">
        {options.map((option) => {
          const isDisabled = option.requiresPremium && !isPremium;
          const isSelected = selectedLength === option.id;

          return (
            <TooltipProvider key={option.id} delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-disabled={isDisabled}
                    disabled={isDisabled}
                    onClick={() => !isDisabled && onLengthChange(option.id)}
                    className={cn(
                      "relative flex flex-col items-center gap-0.5 rounded-md px-3 py-2 text-sm font-medium transition-all",
                      "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                      isSelected && !isDisabled
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : isDisabled
                          ? "text-muted-foreground cursor-not-allowed opacity-50"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span className="flex items-center gap-1">
                      {option.label}
                      {isDisabled && (
                        <Lock
                          className="text-muted-foreground/60 h-2.5 w-2.5 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                    <span className="text-[10px] font-normal tabular-nums">
                      {option.id === "short" && "≤280"}
                      {option.id === "medium" && "281–1K"}
                      {option.id === "long" && "1K–2K"}
                    </span>
                  </button>
                </TooltipTrigger>
                {isDisabled && (
                  <TooltipContent side="bottom" className="text-xs">
                    Requires X Premium subscription
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}
