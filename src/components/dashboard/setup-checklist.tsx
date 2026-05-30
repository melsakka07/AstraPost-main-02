"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronDown, Circle, Rocket, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface SetupChecklistProps {
  hasXAccount: boolean;
  hasScheduledPost: boolean;
  hasUsedAI: boolean;
  hasProPlan: boolean;
  /** Server-persisted onboarding/checklist state (user.onboardingState JSONB). */
  onboardingState?: {
    tourSeen?: boolean;
    checklistDismissedAt?: string | null;
    checklistCollapsed?: boolean;
    version?: number;
  } | null;
}

const STORAGE_KEY = "setup-checklist-hidden";
const COLLAPSED_KEY = "setup-checklist-collapsed";

export function SetupChecklist({
  hasXAccount,
  hasScheduledPost,
  hasUsedAI,
  hasProPlan,
  onboardingState,
}: SetupChecklistProps) {
  const searchParams = useSearchParams();

  // Initialize from server-persisted state (hydration-safe — no localStorage in initializer).
  const serverDismissed = onboardingState?.checklistDismissedAt != null;
  const serverCollapsed = onboardingState?.checklistCollapsed === true;

  const [isVisible, setIsVisible] = useState(!serverDismissed);
  const [isExpanded, setIsExpanded] = useState(!serverCollapsed);
  const tChecklist = useTranslations("setup_checklist");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const checklistOpen = searchParams.get("checklist") === "open";

    if (checklistOpen) {
      // Reset both server and localStorage state for the "force open" URL param.
      localStorage.setItem(STORAGE_KEY, "false");
      localStorage.setItem(COLLAPSED_KEY, "false");
      setIsVisible(true);
      setIsExpanded(true);
      fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboardingState: { checklistDismissedAt: null, checklistCollapsed: false },
        }),
      }).catch(() => {});
      return;
    }

    // Backward compat: if server state was never set (existing users pre-migration),
    // fall back to localStorage.
    if (!serverDismissed && localStorage.getItem(STORAGE_KEY) === "true") {
      setIsVisible(false);
    }
    if (!serverCollapsed && localStorage.getItem(COLLAPSED_KEY) === "true") {
      setIsExpanded(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [searchParams, serverDismissed, serverCollapsed]);

  const t = useTranslations("dashboard_shell");

  if (!isVisible) return null;

  const steps = [
    {
      id: "connect-x",
      label: t("setup_checklist.connect_x"),
      completed: hasXAccount,
      href: "/dashboard/settings",
      cta: t("setup_checklist.connect_x"),
    },
    {
      id: "schedule-post",
      label: t("setup_checklist.schedule_post"),
      completed: hasScheduledPost,
      href: "/dashboard/compose",
      cta: t("setup_checklist.schedule_post"),
    },
    {
      id: "try-ai",
      label: t("setup_checklist.use_ai"),
      completed: hasUsedAI,
      href: "/dashboard/compose?tab=ai",
      cta: t("setup_checklist.use_ai"),
    },
    {
      id: "explore-analytics",
      label: t("setup_checklist.view_analytics"),
      completed: hasXAccount && hasScheduledPost,
      href: "/dashboard/analytics",
      cta: t("setup_checklist.view_analytics"),
    },
    {
      id: "upgrade-pro",
      label: t("setup_checklist.upgrade_to_pro"),
      completed: hasProPlan,
      href: "/pricing",
      cta: t("setup_checklist.upgrade_to_pro"),
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;
  const allCompleted = completedCount === steps.length;

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
    // Persist server-side so dismissal survives logout/device switch.
    fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        onboardingState: { checklistDismissedAt: new Date().toISOString() },
      }),
    }).catch(() => {});
  };

  const toggleExpanded = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    localStorage.setItem(COLLAPSED_KEY, next ? "false" : "true");
    // Persist server-side.
    fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        onboardingState: { checklistCollapsed: !next },
      }),
    }).catch(() => {});
  };

  if (!isVisible) return null;
  if (allCompleted) return null;

  return (
    <div className="border-primary/20 from-primary/5 via-primary/[0.02] rounded-xl border bg-gradient-to-r to-transparent">
      {/* Compact header — always visible */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
          <Rocket className="text-primary h-4 w-4" />
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="text-sm font-semibold">{t("setup_checklist.title")}</span>
          <span className="text-muted-foreground text-xs">
            {completedCount}/{steps.length}
          </span>
          <Progress value={progress} className="hidden h-1.5 w-24 sm:block" />
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleExpanded}
            aria-label={
              isExpanded ? tChecklist("collapse_checklist") : tChecklist("expand_checklist")
            }
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-7 w-7"
            onClick={handleDismiss}
            aria-label={t("setup_checklist.dismiss")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Expandable step list */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-wrap gap-2 px-4 pb-4">
            {steps.map((step) =>
              step.completed ? (
                <div
                  key={step.id}
                  className="text-muted-foreground border-success-9/20 bg-success-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <CheckCircle2 className="text-success-11 h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap line-through">{step.label}</span>
                </div>
              ) : (
                <Link
                  key={step.id}
                  href={step.href}
                  className="group border-border bg-background hover:border-primary/30 hover:bg-primary/5 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all"
                >
                  <Circle className="text-muted-foreground group-hover:text-primary h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{step.label}</span>
                  <span className="text-primary ms-1 text-xs font-medium opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                    {step.cta}
                  </span>
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
