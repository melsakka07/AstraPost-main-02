import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Sparkles, TrendingUp } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { AiToolsGrid, type AiToolId } from "@/components/ai/ai-tools-grid";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getUserPlanType } from "@/lib/middleware/require-plan";
import { getPlanLimits, type PlanLimits } from "@/lib/plan-limits";
import { getMonthlyAiUsage } from "@/lib/services/ai-quota";
import { getTeamContext } from "@/lib/team-context";

function buildLockedMap(limits: PlanLimits): Record<AiToolId, boolean> {
  return {
    thread_writer: !limits.canUseAi,
    url_to_thread: !limits.enabledTools.includes("url_to_thread"),
    pdf_to_thread: !limits.enabledTools.includes("pdf_to_thread"),
    youtube_to_thread: !limits.enabledTools.includes("youtube_to_thread"),
    ab_variants: !limits.enabledTools.includes("variant_generator"),
    hashtag_generator: !limits.canUseAi,
    bio_generator: !limits.enabledTools.includes("bio_optimizer"),
    reply_generator: !limits.enabledTools.includes("reply_generator"),
    ai_calendar: !limits.enabledTools.includes("content_calendar"),
  };
}

export default async function AIHubPage() {
  const t = await getTranslations("ai_hub");

  const ctx = await getTeamContext();
  if (!ctx) redirect("/login");

  const locale = await getLocale();

  const [userPlan, usage] = await Promise.all([
    getUserPlanType(ctx.currentTeamId),
    getMonthlyAiUsage(ctx.currentTeamId).catch(() => ({
      used: 0,
      limit: null as number | null,
      resetDate: new Date().toISOString(),
    })),
  ]);

  const limits = getPlanLimits(userPlan);
  const lockedMap = buildLockedMap(limits);
  const isQuotaExhausted = usage.limit !== null && usage.used >= usage.limit;
  const quotaPercentage = usage.limit ? Math.round((usage.used / usage.limit) * 100) : 0;
  const trialActive = userPlan === "trial";

  return (
    <DashboardPageWrapper icon={Sparkles} title={t("title")} description={t("description")}>
      {/* UA-A16: AI Quota Meter */}
      {usage.limit !== null && (
        <div className="mb-6">
          <Card className={isQuotaExhausted ? "border-destructive/50 bg-destructive/5" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-primary h-5 w-5" />
                  <CardTitle>{t("quota_title")}</CardTitle>
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
                    {usage.used} / {usage.limit} {t("generations")}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {quotaPercentage}% {t("used_percent")}
                  </span>
                </div>
                <Progress value={Math.min(quotaPercentage, 100)} className="h-2" />
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

              {isQuotaExhausted ? (
                <div className="bg-destructive/10 border-destructive/20 space-y-3 rounded-lg border p-3">
                  <p className="text-destructive text-sm font-medium">{t("quota_reached")}</p>
                  <Button asChild variant="default" size="sm" className="w-full">
                    <Link href="/dashboard/settings/billing">{t("upgrade_pro")}</Link>
                  </Button>
                </div>
              ) : quotaPercentage >= 80 ? (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    {t.rich("quota_warning", {
                      quota: quotaPercentage,
                    })}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}

      <AiToolsGrid
        lockedMap={lockedMap}
        isQuotaExhausted={isQuotaExhausted}
        userPlan={userPlan}
        trialActive={trialActive}
      />
    </DashboardPageWrapper>
  );
}
