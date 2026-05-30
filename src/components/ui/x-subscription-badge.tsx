"use client";

import { useTranslations } from "next-intl";
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
  // Translation key under the "x_tier" namespace.
  labelKey: "none" | "basic" | "premium" | "premium_plus" | "unknown";
}

const tierConfig: Record<string, TierConfig> = {
  None: { color: "bg-muted-foreground/40", labelKey: "none" },
  Basic: { color: "bg-yellow-500", labelKey: "basic" },
  Premium: { color: "bg-blue-500", labelKey: "premium" },
  PremiumPlus: { color: "bg-blue-500 ring-2 ring-yellow-400", labelKey: "premium_plus" },
};

const unknownConfig: TierConfig = {
  color: "bg-muted-foreground/40",
  labelKey: "unknown",
};
const defaultConfig: TierConfig = { color: "bg-muted-foreground/40", labelKey: "none" };

export function XSubscriptionBadge({
  tier,
  size = "sm",
  loading = false,
  showUnknown = false,
}: XSubscriptionBadgeProps) {
  const t = useTranslations("x_tier");
  const sizeClasses = size === "sm" ? "h-2 w-2" : "h-3 w-3";

  if (loading) {
    return (
      <span
        className={`${sizeClasses} bg-muted-foreground/30 animate-pulse rounded-full`}
        aria-label={t("loading")}
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

  const label = t(config.labelKey);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`${sizeClasses} rounded-full ${config.color} shrink-0 cursor-default`}
            aria-label={label}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
