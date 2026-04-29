"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Sparkles,
  Loader2,
  Clock,
  ChevronRight,
  CalendarCheck,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { useElapsedTime } from "@/hooks/use-elapsed-time";

interface CalendarItem {
  day: string;
  time: string;
  topic: string;
  tweetType: "tweet" | "thread" | "poll" | "question";
  tone: string;
  brief: string;
}

const TWEET_TYPE_COLORS: Record<string, string> = {
  tweet: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  thread: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  poll: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  question: "bg-green-500/10 text-green-600 border-green-500/20",
};

interface PlanLimitPayload {
  error?: string;
  code?: string;
  message?: string;
  feature?: string;
  plan?: string;
  limit?: number | null;
  used?: number;
  remaining?: number | null;
  upgrade_url?: string;
  suggested_plan?: string;
  trial_active?: boolean;
  reset_at?: string | null;
}

interface XAccount {
  id: string;
  xUsername: string;
  xDisplayName: string;
  xAvatarUrl: string | null;
  isDefault: boolean;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function getWeekLabel(
  weekNum: number,
  baseDate: Date,
  t: ReturnType<typeof useTranslations<"ai_calendar">>
): string {
  const day = baseDate.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + diffToMonday + (weekNum - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const sm = MONTH_NAMES[monday.getMonth()]!;
  const em = MONTH_NAMES[sunday.getMonth()]!;
  if (monday.getMonth() === sunday.getMonth()) {
    return t("week_label_same_month", {
      weekNum,
      startMonth: sm,
      startDay: monday.getDate(),
      endDay: sunday.getDate(),
    });
  }
  return t("week_label_cross_month", {
    weekNum,
    startMonth: sm,
    startDay: monday.getDate(),
    endMonth: em,
    endDay: sunday.getDate(),
  });
}

export default function ContentCalendarPage() {
  const t = useTranslations("ai_calendar");
  const router = useRouter();
  const { openWithContext } = useUpgradeModal();

  const [niche, setNiche] = useState("");
  const [language, setLanguage] = useState("en");
  const [postsPerWeek, setPostsPerWeek] = useState(3);
  const [weeks, setWeeks] = useState(1);
  const [tone, setTone] = useState("professional");
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const elapsed = useElapsedTime(isGenerating);

  // Schedule All dialog state
  const [scheduleAllOpen, setScheduleAllOpen] = useState(false);
  const [scheduleAllAccounts, setScheduleAllAccounts] = useState<XAccount[]>([]);
  const [scheduleAllAccountId, setScheduleAllAccountId] = useState("");
  const [scheduleAllStartDate, setScheduleAllStartDate] = useState("");
  const [scheduleAllLoading, setScheduleAllLoading] = useState(false);
  const [scheduleAllFetching, setScheduleAllFetching] = useState(false);

  const handleGenerate = async () => {
    if (!niche.trim()) {
      toast.error(t("toasts.enter_topic"));
      return;
    }

    setIsGenerating(true);
    setItems([]);

    try {
      const res = await fetch("/api/ai/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, language, postsPerWeek, weeks, tone }),
      });

      if (!res.ok) {
        if (res.status === 402) {
          let payload: PlanLimitPayload | null = null;
          try {
            payload = (await res.json()) as PlanLimitPayload;
          } catch {}
          openWithContext({
            error: payload?.error,
            code: payload?.code,
            message: payload?.message,
            feature: payload?.feature,
            plan: payload?.plan,
            limit: payload?.limit,
            used: payload?.used,
            remaining: payload?.remaining,
            upgradeUrl: payload?.upgrade_url,
            suggestedPlan: payload?.suggested_plan,
            trialActive: payload?.trial_active,
            resetAt: payload?.reset_at,
          });
          return;
        }
        throw new Error("Failed to generate calendar");
      }

      const data = (await res.json()) as { items: CalendarItem[] };
      setItems(data.items ?? []);
      setGeneratedAt(new Date());
    } catch {
      toast.error(t("toasts.generation_failed"));
    } finally {
      setIsGenerating(false);
    }
  };

  const openInComposer = (item: CalendarItem) => {
    const params = new URLSearchParams({
      prefill: item.brief,
      type: item.tweetType === "thread" ? "thread" : "tweet",
      tone: item.tone,
      topic: item.topic,
    });
    router.push(`/dashboard/compose?${params.toString()}`);
  };

  // Returns next Monday as YYYY-MM-DD
  function nextMonday(): string {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }

  // Resolve a calendar item's day name + week number + time string to an actual Date
  function resolveItemDate(
    dayName: string,
    weekNum: number,
    startDate: Date,
    timeStr: string
  ): Date {
    const DAY_OFFSETS: Record<string, number> = {
      Monday: 0,
      Tuesday: 1,
      Wednesday: 2,
      Thursday: 3,
      Friday: 4,
      Saturday: 5,
      Sunday: 6,
    };
    const dayOffset = DAY_OFFSETS[dayName] ?? 0;
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + (weekNum - 1) * 7 + dayOffset);
    const match = timeStr.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (match) {
      let h = parseInt(match[1]!, 10);
      const m = parseInt(match[2]!, 10);
      const mer = match[3]?.toUpperCase();
      if (mer === "PM" && h < 12) h += 12;
      if (mer === "AM" && h === 12) h = 0;
      date.setHours(h, m, 0, 0);
    }
    return date;
  }

  const openScheduleAll = async () => {
    setScheduleAllStartDate(nextMonday());
    setScheduleAllOpen(true);
    setScheduleAllFetching(true);
    try {
      const res = await fetch("/api/x/accounts");
      if (res.ok) {
        const data = (await res.json()) as { accounts: XAccount[] };
        const accounts = data.accounts ?? [];
        setScheduleAllAccounts(accounts);
        const def = accounts.find((a) => a.isDefault) ?? accounts[0];
        if (def) setScheduleAllAccountId(def.id);
      } else {
        toast.error(t("toasts.load_accounts_failed"));
      }
    } catch {
      toast.error(t("toasts.load_accounts_failed"));
    } finally {
      setScheduleAllFetching(false);
    }
  };

  const handleScheduleAll = async () => {
    if (!scheduleAllAccountId) {
      toast.error(t("toasts.select_account"));
      return;
    }
    if (!scheduleAllStartDate) {
      toast.error(t("toasts.select_start_date"));
      return;
    }

    setScheduleAllLoading(true);
    const [y, mo, d] = scheduleAllStartDate.split("-").map(Number);
    const startDate = new Date(y!, mo! - 1, d!, 0, 0, 0, 0);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const weekNum = Math.floor(i / postsPerWeek) + 1;
      const scheduledAt = resolveItemDate(item.day, weekNum, startDate, item.time);

      try {
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tweets: [{ content: item.brief }],
            targetAccountIds: [`twitter:${scheduleAllAccountId}`],
            scheduledAt: scheduledAt.toISOString(),
            action: "schedule",
          }),
        });
        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    setScheduleAllLoading(false);
    setScheduleAllOpen(false);

    if (errorCount === 0) {
      toast.success(t("toasts.scheduled_count", { count: successCount }));
      router.push("/dashboard/queue");
    } else if (successCount > 0) {
      toast.warning(t("toasts.scheduled_partial", { success: successCount, failed: errorCount }));
      router.push("/dashboard/queue");
    } else {
      toast.error(t("toasts.schedule_failed"));
    }
  };

  // Group items into weeks (by position), then by day within each week
  const byWeek = items.reduce<Array<{ weekNum: number; byDay: Record<string, CalendarItem[]> }>>(
    (acc, item, idx) => {
      const weekIdx = Math.floor(idx / postsPerWeek);
      if (!acc[weekIdx]) acc[weekIdx] = { weekNum: weekIdx + 1, byDay: {} };
      const week = acc[weekIdx]!;
      if (!week.byDay[item.day]) week.byDay[item.day] = [];
      week.byDay[item.day]!.push(item);
      return acc;
    },
    []
  );

  const DAYS_SHORT = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

  return (
    <DashboardPageWrapper icon={CalendarDays} title={t("title")} description={t("description")}>
      <Breadcrumb items={[{ label: t("breadcrumb") }]} className="mb-2" />
      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        {/* Config Panel */}
        <Card className="h-fit lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">{t("configure_calendar")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="niche">{t("niche_topic")}</Label>
              <Input
                id="niche"
                placeholder={t("niche_placeholder")}
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("language")}</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["ar", "en", "fr", "de", "es", "it", "pt", "tr", "ru", "hi"] as const).map(
                    (code) => (
                      <SelectItem key={code} value={code}>
                        {t(`language_options.${code}`)}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("default_tone")}</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      "professional",
                      "casual",
                      "educational",
                      "inspirational",
                      "humorous",
                      "viral",
                    ] as const
                  ).map((toneKey) => (
                    <SelectItem key={toneKey} value={toneKey}>
                      {t(`tone_options.${toneKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t("posts_per_week")}</Label>
                <span className="text-muted-foreground text-sm font-medium">{postsPerWeek}</span>
              </div>
              <Slider
                value={[postsPerWeek]}
                onValueChange={(v) => setPostsPerWeek(v[0] ?? 3)}
                min={1}
                max={7}
                step={1}
                aria-label={t("posts_per_week")}
                aria-valuetext={`${postsPerWeek} ${t("tweets")}`}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t("weeks_to_plan")}</Label>
                <span className="text-muted-foreground text-sm font-medium">
                  {weeks} {weeks > 1 ? t("weeks") : t("week")}
                </span>
              </div>
              <Slider
                value={[weeks]}
                onValueChange={(v) => setWeeks(v[0] ?? 1)}
                min={1}
                max={4}
                step={1}
                aria-label={t("weeks_to_plan")}
                aria-valuetext={`${weeks} ${weeks === 1 ? t("week") : t("weeks")}`}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={isGenerating || !niche.trim()}
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t("generating_with_time", { elapsed })}
                </>
              ) : (
                <>
                  <Sparkles className="me-2 h-4 w-4" />
                  {t("generate_calendar")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Calendar Results */}
        <div className="space-y-4 lg:col-span-2">
          {items.length > 0 && !isGenerating && (
            <div className="border-border bg-muted/30 flex items-center justify-between rounded-lg border px-4 py-2.5">
              <p className="text-muted-foreground text-sm">
                <span className="text-foreground font-medium">{items.length}</span>{" "}
                {items.length === 1
                  ? t("posts_planned", { count: 1 })
                  : t("posts_planned", { count: items.length })}
              </p>
              <Button size="sm" onClick={openScheduleAll}>
                <CalendarCheck className="me-2 h-4 w-4" />
                {t("schedule_all")}
              </Button>
            </div>
          )}
          {items.length === 0 && !isGenerating ? (
            <div className="border-border bg-muted/20 space-y-4 rounded-xl border border-dashed p-5">
              <div
                className="pointer-events-none opacity-25 blur-[1.5px] select-none"
                aria-hidden="true"
              >
                <div className="mb-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {DAYS_SHORT.slice(0, 4).map((d) => (
                    <div
                      key={d}
                      className="text-muted-foreground py-0.5 text-center text-[10px] font-semibold"
                    >
                      {t(`days_short.${d}`)}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-card space-y-1 rounded-md border p-1.5">
                      <div className="bg-muted-foreground/30 h-2 w-full rounded" />
                      <div className="bg-muted-foreground/20 h-2 w-3/4 rounded" />
                      <div className="bg-primary/20 mt-1 h-3.5 w-3.5 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">{t("calendar_appears")}</p>
                <p className="text-muted-foreground mt-1 text-xs">{t("set_niche_schedule")}</p>
              </div>
            </div>
          ) : isGenerating ? (
            <div className="border-border bg-muted/20 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-16 text-center">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
              <p className="text-muted-foreground text-sm">{t("building_calendar")}</p>
            </div>
          ) : (
            byWeek.map(({ weekNum, byDay }) => (
              <div key={weekNum} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold">
                    {generatedAt
                      ? getWeekLabel(weekNum, generatedAt, t)
                      : t("week_label_same_month", {
                          weekNum,
                          startMonth: "",
                          startDay: "",
                          endDay: "",
                        })}
                  </h2>
                  <div className="bg-border h-px flex-1" />
                </div>
                {Object.entries(byDay).map(([day, dayItems]) => (
                  <div key={day}>
                    <h3 className="text-muted-foreground mb-2 px-1 text-sm font-semibold tracking-wide uppercase">
                      {day}
                    </h3>
                    <div className="space-y-2">
                      {dayItems.map((item, idx) => (
                        <Card key={idx} className="hover:border-primary/30 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                                      TWEET_TYPE_COLORS[item.tweetType] ?? ""
                                    }`}
                                  >
                                    {t(
                                      `tweet_type.${item.tweetType as "tweet" | "thread" | "poll" | "question"}`
                                    )}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {t(`tone_options.${item.tone}` as any) || item.tone}
                                  </Badge>
                                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                                    <Clock className="h-3 w-3" />
                                    {item.time}
                                  </span>
                                </div>
                                <p className="text-sm leading-snug font-medium">{item.topic}</p>
                                <p className="text-muted-foreground text-xs leading-relaxed">
                                  {item.brief}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="shrink-0"
                                onClick={() => openInComposer(item)}
                                aria-label={t("open_in_composer")}
                              >
                                <ChevronRight
                                  className="h-4 w-4 rtl:scale-x-[-1]"
                                  aria-hidden="true"
                                />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
      {/* Schedule All Dialog */}
      <Dialog open={scheduleAllOpen} onOpenChange={setScheduleAllOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="text-primary h-5 w-5" />
              {t("schedule_dialog_title")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <p className="text-muted-foreground text-sm">
              {t("schedule_dialog_description", { count: items.length })}
            </p>

            {/* Account selector */}
            <div className="space-y-2">
              <Label htmlFor="sa-account" className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {t("post_to")}
              </Label>
              {scheduleAllFetching ? (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("loading_accounts")}
                </div>
              ) : scheduleAllAccounts.length === 0 ? (
                <p className="text-destructive text-sm">
                  {t("no_connected_accounts")}{" "}
                  <a href="/dashboard/settings" className="underline">
                    {t("connect_in_settings")}
                  </a>
                  .
                </p>
              ) : (
                <Select value={scheduleAllAccountId} onValueChange={setScheduleAllAccountId}>
                  <SelectTrigger id="sa-account">
                    <SelectValue placeholder={t("account_placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleAllAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        @{acc.xUsername}
                        {acc.isDefault && (
                          <span className="text-muted-foreground ms-2 text-xs">
                            {t("default_badge")}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Start date */}
            <div className="space-y-2">
              <Label htmlFor="sa-start" className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {t("week_starts_on")}
              </Label>
              <Input
                id="sa-start"
                type="date"
                value={scheduleAllStartDate}
                onChange={(e) => setScheduleAllStartDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
              <p className="text-muted-foreground text-xs">{t("week_start_help")}</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setScheduleAllOpen(false)}
              disabled={scheduleAllLoading}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleScheduleAll}
              disabled={
                scheduleAllLoading ||
                scheduleAllFetching ||
                !scheduleAllAccountId ||
                !scheduleAllStartDate
              }
            >
              {scheduleAllLoading ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t("scheduling")}
                </>
              ) : (
                <>
                  <CalendarCheck className="me-2 h-4 w-4" />
                  {t("schedule_n_posts", { count: items.length })}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardPageWrapper>
  );
}
