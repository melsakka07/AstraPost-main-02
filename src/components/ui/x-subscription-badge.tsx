"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type XSubscriptionTier = "None" | "Basic" | "Premium" | "PremiumPlus" | null;

interface XSubscriptionBadgeProps {
  tier: XSubscriptionTier;
  size?: "sm" | "md";
  loading?: boolean;
  showUnknown?: boolean;
}

interface TierConfig {
  color: string;
  ring?: string;
  label: string;
}

const tierConfig: Record<string, TierConfig> = {
  None: { color: "bg-muted-foreground/40", label: "Free X account" },
  Basic: { color: "bg-yellow-500", label: "X Basic subscriber" },
  Premium: { color: "bg-blue-500", label: "X Premium subscriber" },
  PremiumPlus: { color: "bg-blue-500 ring-2 ring-yellow-400", label: "X Premium+ subscriber" },
};

const unknownConfig: TierConfig = { color: "bg-muted-foreground/40", label: "Subscription status unknown" };
const defaultConfig: TierConfig = { color: "bg-muted-foreground/40", label: "Free X account" };

export function XSubscriptionBadge({ tier, size = "sm", loading = false, showUnknown = false }: XSubscriptionBadgeProps) {
  const sizeClasses = size === "sm" ? "h-2 w-2" : "h-3 w-3";

  if (loading) {
    return (
      <span
        className={`${sizeClasses} rounded-full bg-muted-foreground/30 animate-pulse`}
        aria-label="Loading subscription tier"
      />
    );
  }

  const isUnknown = showUnknown && tier === null;
  let config: TierConfig;
  
  if (isUnknown) {
    config = unknownConfig;
  } else if (tier && tierConfig[tier]) {
    config = tierConfig[tier];
  } else {
    config = defaultConfig;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`${sizeClasses} rounded-full ${config.color} shrink-0 cursor-default`}
            aria-label={config.label}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {config.label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
