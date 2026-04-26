import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Hash,
  Link2,
  PenTool,
  Shuffle,
  Sparkles,
  UserPen,
  MessageCircle,
  CalendarDays,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getMonthlyAiUsage } from "@/lib/services/ai-quota";
import { getTeamContext } from "@/lib/team-context";

interface AiTool {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  isPro?: boolean;
}

export default async function AIHubPage() {
  const t = await getTranslations("ai_hub");

  const aiTools: AiTool[] = [
    {
      icon: PenTool,
      title: t("tools.thread_writer.title"),
      description: t("tools.thread_writer.description"),
      href: "/dashboard/ai/writer",
    },
    {
      icon: Link2,
      title: t("tools.url_to_thread.title"),
      description: t("tools.url_to_thread.description"),
      href: "/dashboard/ai/writer?tab=url",
    },
    {
      icon: Shuffle,
      title: t("tools.ab_variants.title"),
      description: t("tools.ab_variants.description"),
      href: "/dashboard/ai/writer?tab=variants",
    },
    {
      icon: Hash,
      title: t("tools.hashtag_generator.title"),
      description: t("tools.hashtag_generator.description"),
      href: "/dashboard/ai/writer?tab=hashtags",
    },
    {
      icon: UserPen,
      title: t("tools.bio_generator.title"),
      description: t("tools.bio_generator.description"),
      href: "/dashboard/ai/bio",
      isPro: true,
    },
    {
      icon: MessageCircle,
      title: t("tools.reply_generator.title"),
      description: t("tools.reply_generator.description"),
      href: "/dashboard/ai/reply",
      isPro: true,
    },
    {
      icon: CalendarDays,
      title: t("tools.ai_calendar.title"),
      description: t("tools.ai_calendar.description"),
      href: "/dashboard/ai/calendar",
      isPro: true,
    },
  ];
  // UA-A16: Fetch AI quota data
  const ctx = await getTeamContext();
  if (!ctx) redirect("/login");

  let usage = { used: 0, limit: null as number | null, resetDate: new Date().toISOString() };
  try {
    usage = await getMonthlyAiUsage(ctx.currentTeamId);
  } catch {
    // If quota fetch fails, page still renders with 0 usage
  }

  const isQuotaExhausted = usage.limit !== null && usage.used >= usage.limit;
  const quotaPercentage = usage.limit ? Math.round((usage.used / usage.limit) * 100) : 0;

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
                  date: new Date(usage.resetDate).toLocaleDateString("en-US", {
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {aiTools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className={`group block ${isQuotaExhausted ? "pointer-events-none opacity-50" : ""}`}
          >
            <Card className="hover:border-primary/40 hover:bg-muted/40 h-full transition-colors">
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="bg-primary/10 group-hover:bg-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors">
                    <tool.icon className="text-primary h-5 w-5" />
                  </div>
                  {tool.isPro && (
                    <Badge
                      variant="outline"
                      className="border-primary/30 text-primary h-4 px-1.5 py-0 text-[10px]"
                    >
                      Pro
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="group-hover:text-primary text-sm leading-tight font-semibold transition-colors">
                    {tool.title}
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {tool.description}
                  </p>
                </div>
                <p className="text-primary mt-auto text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100">
                  {t("try_it")}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </DashboardPageWrapper>
  );
}
