import Link from "next/link";
import { ArrowRight, Calendar, PenSquare, Sparkles, Wand2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** The context-aware next-best-action, derived in the RSC from setup state. */
export type NextBestActionKey = "connect_x" | "schedule_first" | "try_ai" | "compose";

interface NextBestAction {
  key: NextBestActionKey;
  href: string;
}

/**
 * Picks the single most relevant next step from the user's setup state.
 * Pure function — testable, no I/O.
 */
export function selectNextBestAction(checklist: {
  hasXAccount: boolean;
  hasScheduledPost: boolean;
  hasUsedAI: boolean;
}): NextBestAction {
  if (!checklist.hasXAccount) {
    return { key: "connect_x", href: "/dashboard/settings" };
  }
  if (!checklist.hasScheduledPost) {
    return { key: "schedule_first", href: "/dashboard/compose" };
  }
  if (!checklist.hasUsedAI) {
    return { key: "try_ai", href: "/dashboard/ai/agentic" };
  }
  return { key: "compose", href: "/dashboard/compose" };
}

interface QuickActionsProps {
  action: NextBestAction;
}

/**
 * Hero "What's next" zone. Leads the dashboard with the most relevant
 * next-best-action CTA plus the always-available primary actions.
 * Presentational RSC — no client features, so no "use client".
 */
export async function QuickActions({ action }: QuickActionsProps) {
  const t = await getTranslations("dashboard");

  const labels: Record<NextBestActionKey, { title: string; desc: string }> = {
    connect_x: { title: t("whats_next.connect_x"), desc: t("whats_next.connect_x_desc") },
    schedule_first: {
      title: t("whats_next.schedule_first"),
      desc: t("whats_next.schedule_first_desc"),
    },
    try_ai: { title: t("whats_next.try_ai"), desc: t("whats_next.try_ai_desc") },
    compose: { title: t("whats_next.compose"), desc: t("whats_next.compose_desc") },
  };
  const current = labels[action.key];

  return (
    <Card className="border-brand-6 bg-brand-2 md:col-span-1 lg:col-span-4">
      <CardHeader className="flex flex-row items-center gap-2 px-4 py-4">
        <div className="bg-brand-3 text-brand-11 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
          <Sparkles className="h-4 w-4" />
        </div>
        <CardTitle className="text-base sm:text-lg">{t("whats_next.title")}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-0 pb-4">
        <div className="space-y-4">
          <div>
            <p className="text-base font-semibold tracking-tight">{current.title}</p>
            <p className="text-muted-foreground mt-1 text-sm">{current.desc}</p>
          </div>

          <Button asChild className="min-h-11 w-full">
            <Link href={action.href}>
              {current.title}
              <ArrowRight className="ms-2 h-4 w-4 rtl:scale-x-[-1]" />
            </Link>
          </Button>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button asChild variant="outline" size="sm" className="min-h-11 w-full">
              <Link href="/dashboard/compose">
                <PenSquare className="me-2 h-3.5 w-3.5" />
                {t("whats_next.compose_action")}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="min-h-11 w-full">
              <Link href="/dashboard/ai/agentic">
                <Wand2 className="me-2 h-3.5 w-3.5" />
                {t("generate_ai")}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="min-h-11 w-full">
              <Link href="/dashboard/compose">
                <Calendar className="me-2 h-3.5 w-3.5" />
                {t("whats_next.schedule_action")}
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
