"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Sparkles, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlanType } from "@/lib/plan-limits";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "astrapost-upsell-dismissed";

interface UpsellBannerProps {
  plan?: string | null;
  className?: string;
}

export function UpsellBanner({ plan, className }: UpsellBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return sessionStorage.getItem(STORAGE_KEY) === "true";
  });

  const handleDismiss = useCallback(() => {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  }, []);

  // Only show for free or trial users
  const normalizedPlan = (plan ?? "free") as PlanType;
  if (normalizedPlan !== "free" && normalizedPlan !== "trial") return null;
  if (dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "bg-primary/5 border-primary/10 relative flex items-center gap-3 rounded-lg border px-4 py-3",
        className
      )}
    >
      <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
        <Sparkles className="text-primary h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Pro uses Sonnet 4.6 for stronger output.</p>
        <p className="text-muted-foreground text-xs">Upgrade for higher quality AI content.</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button asChild size="sm" className="h-8 gap-1 text-xs">
          <Link href="/pricing">
            Upgrade
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground h-7 w-7"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
