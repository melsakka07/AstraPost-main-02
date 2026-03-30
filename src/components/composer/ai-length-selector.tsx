"use client";

import { Lock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Post Length</span>
        <span className="text-xs text-muted-foreground">
          {AI_LENGTH_OPTIONS[selectedLength].description}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-lg border bg-muted/50 p-1">
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
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected && !isDisabled
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : isDisabled
                          ? "opacity-50 cursor-not-allowed text-muted-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span>{option.label}</span>
                    <span className="text-[10px] font-normal tabular-nums">
                      {option.id === "short" && "≤280"}
                      {option.id === "medium" && "281–1K"}
                      {option.id === "long" && "1K–2K"}
                    </span>
                    {isDisabled && (
                      <Lock className="absolute -top-1 -right-1 h-3 w-3 text-muted-foreground/60" />
                    )}
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
