import Link from "next/link";
import { redirect } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { AlertCircle, Info, Sparkles, TrendingUp } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { AiToolsGrid, type AiToolId } from "@/components/ai/ai-tools-grid";
import { PlanStatusBadge } from "@/components/billing/plan-status-badge";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getPlanStatus } from "@/lib/middleware/require-plan";
import { getPlanLimits, type PlanLimits } from "@/lib/plan-limits";
import { getMonthlyAiUsage } from "@/lib/services/ai-quota";
import { getTeamContext } from "@/lib/team-context";

function buildLockedMap(limits: PlanLimits): Record<AiToolId, boolean> {
  return {
    thread_writer: !limits.canUseAi,
    url_to_thread: !limits.enabledTools.includes("url_to_thread"),
    pdf_to_thread: !limits.enabledTools.includes("pdf_to_thread"),
    youtube_to_thread: !limits.enabledTools.includes("youtube_to_thread"),
    agentic: !limits.enabledTools.includes("agentic_posting"),
    ab_variants: !limits.enabledTools.includes("variant_generator"),
    hashtag_generator: !limits.canUseAi,
    bio_generator: !limits.enabledTools.includes("bio_optimizer"),
    reply_generator: !limits.enabledTools.includes("reply_generator"),
    ai_calendar: !limits.enabledTools.includes("content_calendar"),
    discover: false, // handled via discoverLocked prop (plan + quota)
    import_adapt: !limits.enabledTools.includes("inspiration"),
  };
}

export default async function AIHubPage() {
  const t = await getTranslations("ai_hub");
  const tPlan = await getTranslations("plan_status");

  const ctx = await getTeamContext();
  if (!ctx) redirect("/login");

  const locale = await getLocale();

  const [planStatus, usage] = await Promise.all([
    getPlanStatus(ctx.currentTeamId),
    getMonthlyAiUsage(ctx.currentTeamId).catch(() => ({
      used: 0,
      limit: null as number | null,
      resetDate: new Date().toISOString(),
    })),
  ]);

  const userPlan = planStatus.effectivePlan;
  const limits = getPlanLimits(userPlan);
  const lockedMap = buildLockedMap(limits);
  const isQuotaExhausted = usage.limit !== null && usage.used >= usage.limit;
  const quotaPercentage = usage.limit ? Math.round((usage.used / usage.limit) * 100) : 0;
  const trialActive = planStatus.isTrialActive || userPlan === "trial";

  // AI Discovery is a Pro tool (Trial + Pro + Agency). Only Free is excluded —
  // matches the ai_discovery gate tier. Locked when quota is exhausted too.
  const discoverLocked = userPlan === "free" || isQuotaExhausted;

  const trialDaysLeft = planStatus.trialEndsAt
    ? Math.max(0, differenceInCalendarDays(new Date(planStatus.trialEndsAt), new Date()))
    : null;

  // Localized plan name for the "included on plan" usage line (plan_status namespace).
  const planNameMap: Record<string, string> = {
    trial: tPlan("trial"),
    free: tPlan("free"),
    pro_monthly: tPlan("pro"),
    pro_annual: tPlan("pro"),
    agency: tPlan("agency"),
  };
  const planName = planNameMap[userPlan] ?? tPlan("free");

  const showTrialEndedNote =
    planStatus.trialExpired && usage.limit !== null && usage.used > usage.limit;
  const resetDateLabel = new Date(usage.resetDate).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <DashboardPageWrapper icon={Sparkles} title={t("title")} description={t("description")}>
      {/* UA-A16: AI Quota Meter */}
      <div className="mb-6">
        <Card className={isQuotaExhausted ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-primary h-5 w-5" />
                <CardTitle>{t("quota_title")}</CardTitle>
                <PlanStatusBadge
                  plan={planStatus.effectivePlan}
                  isTrialActive={planStatus.isTrialActive}
                  trialDaysLeft={trialDaysLeft}
                />
              </div>
              {isQuotaExhausted && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {t("exhausted")}
                </Badge>
              )}
            </div>
            <CardDescription>{t("quota_description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground font-medium">
                  {usage.limit !== null
                    ? `${usage.used} ${t("used_this_month")} · ${usage.limit} ${t("included_on_plan", { plan: planName })}`
                    : `${usage.used} ${t("used_this_month")} · ${t("unlimited_generations")}`}
                </span>
                {usage.limit !== null && (
                  <span className="text-muted-foreground text-xs">
                    {isQuotaExhausted
                      ? t("limit_reached")
                      : `${Math.min(quotaPercentage, 100)}% ${t("used_percent")}`}
                  </span>
                )}
              </div>
              {usage.limit !== null && (
                <Progress value={Math.min(quotaPercentage, 100)} className="h-2" />
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              {t.rich("resets_on", {
                date: new Date(usage.resetDate).toLocaleDateString(locale, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }),
              })}
            </p>

            {showTrialEndedNote && (
              <div className="border-info-6 bg-info-3 text-info-11 flex items-start gap-2 rounded-lg border p-3 text-sm">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{t("trial_ended_note", { date: resetDateLabel, limit: usage.limit ?? 0 })}</p>
              </div>
            )}

            {isQuotaExhausted ? (
              <div className="bg-destructive/10 border-destructive/20 space-y-3 rounded-lg border p-3">
                <p className="text-destructive text-sm font-medium">{t("quota_reached")}</p>
                <Button asChild variant="default" size="sm" className="w-full">
                  <Link href="/dashboard/settings/billing">{t("upgrade_pro")}</Link>
                </Button>
              </div>
            ) : quotaPercentage >= 80 && usage.limit !== null ? (
              <div className="border-warning-6 bg-warning-3 rounded-lg border p-3">
                <p className="text-warning-11 text-sm font-medium">
                  {t.rich("quota_warning", {
                    quota: quotaPercentage,
                  })}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <AiToolsGrid
        lockedMap={lockedMap}
        isQuotaExhausted={isQuotaExhausted}
        userPlan={userPlan}
        trialActive={trialActive}
        resetDate={usage.resetDate}
        discoverLocked={discoverLocked}
      />
    </DashboardPageWrapper>
  );
}
