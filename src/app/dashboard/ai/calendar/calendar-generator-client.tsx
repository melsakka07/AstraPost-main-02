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
  RefreshCw,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { sendToComposer } from "@/lib/composer-bridge";
import { parsePlanLimitResponse, type PlanLimitPayload } from "@/lib/types/plan-limit";

interface CalendarItem {
  day: string;
  time: string;
  topic: string;
  tweetType: "tweet" | "thread" | "poll" | "question";
  tone: string;
  /**
   * Ready-to-publish post text. One entry for tweet/poll/question; multiple
   * entries (a true thread) when tweetType is "thread".
   */
  tweets: string[];
}

/**
 * A single post to send to /api/posts. One calendar item maps to one unit,
 * EXCEPT a thread scheduled by a user without thread access, which is expanded
 * into one single-tweet unit per tweet (staggered in time).
 */
interface ScheduleUnit {
  topic: string;
  tweets: string[];
  scheduledAt: Date;
}

const TWEET_TYPE_COLORS: Record<string, string> = {
  tweet: "bg-info-3 text-info-11 border-info-6",
  thread: "bg-brand-3 text-brand-11 border-brand-6",
  poll: "bg-warning-3 text-warning-11 border-warning-6",
  question: "bg-success-3 text-success-11 border-success-6",
};

/** Valid tone keys matching the i18n tone_options map and TONE_ENUM in constants.ts. */
const KNOWN_TONE_KEYS = new Set([
  "professional",
  "casual",
  "educational",
  "inspirational",
  "humorous",
  "viral",
  "controversial",
]);

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

interface CalendarGeneratorClientProps {
  /** Max days ahead the user's plan allows scheduling; `null` = unlimited. */
  scheduleHorizonDays: number | null;
  /** Whether the plan can schedule multi-tweet threads. Free = false. */
  canScheduleThreads: boolean;
}

export function CalendarGeneratorClient({
  scheduleHorizonDays,
  canScheduleThreads,
}: CalendarGeneratorClientProps) {
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
  const [scheduleAllFailedItems, setScheduleAllFailedItems] = useState<ScheduleUnit[]>([]);
  const [scheduleAllPlanLimit, setScheduleAllPlanLimit] = useState<PlanLimitPayload | null>(null);

  const handleGenerate = async () => {
    if (!niche.trim()) {
      toast.error(t("toasts.enter_topic"));
      return;
    }

    setIsGenerating(true);

    try {
      const res = await fetch("/api/ai/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, language, postsPerWeek, weeks, tone }),
      });

      if (!res.ok) {
        if (res.status === 402) {
          const payload = await parsePlanLimitResponse(res);
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
    // Multi-tweet threads go through the composer bridge (sessionStorage), which
    // hydrates every tweet. Single posts keep the lightweight ?prefill path so the
    // tone + topic hint badge still shows in the composer.
    if (item.tweets.length > 1) {
      sendToComposer(item.tweets, { tone: item.tone, type: "thread" });
      return;
    }
    const params = new URLSearchParams({
      prefill: item.tweets[0] ?? "",
      type: "tweet",
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
    setScheduleAllFailedItems([]);
    setScheduleAllPlanLimit(null);
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

  // Flatten calendar items into individual posts for /api/posts. Normally one
  // item = one unit. A thread scheduled by a user WITHOUT thread access is
  // expanded into one single-tweet unit per tweet, staggered 30 min apart, so
  // the content isn't lost to the Pro-only thread gate (Free fallback).
  function buildScheduleUnits(startDate: Date): ScheduleUnit[] {
    const EXPAND_GAP_MS = 30 * 60 * 1000;
    const units: ScheduleUnit[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const weekNum = Math.floor(i / postsPerWeek) + 1;
      const base = resolveItemDate(item.day, weekNum, startDate, item.time);
      if (item.tweets.length > 1 && !canScheduleThreads) {
        item.tweets.forEach((content, k) => {
          units.push({
            topic: item.topic,
            tweets: [content],
            scheduledAt: new Date(base.getTime() + k * EXPAND_GAP_MS),
          });
        });
      } else {
        units.push({ topic: item.topic, tweets: item.tweets, scheduledAt: base });
      }
    }
    return units;
  }

  const scheduleUnit = async (
    unit: ScheduleUnit
  ): Promise<
    | { ok: true; drafted: boolean }
    | { ok: false; isPlanLimit: boolean; planLimitPayload?: PlanLimitPayload | null }
  > => {
    // Posts beyond the plan's scheduling window are saved as DRAFTS instead of
    // failing — the horizon gate in /api/posts only applies to non-draft actions.
    // This preserves the generated content (no wasted AI credits, no regeneration);
    // the user can schedule the drafts later once their window advances or they upgrade.
    let withinHorizon = true;
    if (scheduleHorizonDays !== null) {
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + scheduleHorizonDays);
      withinHorizon = unit.scheduledAt <= maxDate;
    }

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tweets: unit.tweets.map((content) => ({ content })),
          targetAccountIds: [`twitter:${scheduleAllAccountId}`],
          ...(withinHorizon
            ? { scheduledAt: unit.scheduledAt.toISOString(), action: "schedule" as const }
            : { action: "draft" as const }),
        }),
      });
      if (res.ok) return { ok: true, drafted: !withinHorizon };
      // Detect plan-limit (402) — subsequent units will all fail, stop early
      const isPlanLimit = res.status === 402;
      const planLimitPayload = isPlanLimit ? await parsePlanLimitResponse(res) : null;
      return { ok: false, isPlanLimit, planLimitPayload };
    } catch {
      return { ok: false, isPlanLimit: false };
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
    const units = buildScheduleUnits(startDate);

    let scheduledCount = 0;
    let draftedCount = 0;
    const failedUnits: ScheduleUnit[] = [];
    let planLimitPayload: PlanLimitPayload | null = null;

    for (let i = 0; i < units.length; i++) {
      const result = await scheduleUnit(units[i]!);
      if (result.ok) {
        if (result.drafted) draftedCount++;
        else scheduledCount++;
      } else {
        failedUnits.push(units[i]!);
        // Plan-limit hit: stop immediately — all remaining units will also fail
        if (result.isPlanLimit) {
          planLimitPayload = result.planLimitPayload ?? null;
          for (let j = i + 1; j < units.length; j++) failedUnits.push(units[j]!);
          break;
        }
      }
    }

    setScheduleAllLoading(false);

    if (planLimitPayload) {
      // Plan-limit failure: show upgrade prompt, no retry
      setScheduleAllFailedItems(failedUnits);
      setScheduleAllPlanLimit(planLimitPayload);
      toast.error(t("toasts.schedule_failed"));
      openWithContext({ feature: "posts", ...planLimitPayload });
    } else if (failedUnits.length === 0) {
      setScheduleAllOpen(false);
      setScheduleAllFailedItems([]);
      if (scheduledCount === 0 && draftedCount > 0) {
        toast.success(t("toasts.saved_as_drafts", { count: draftedCount }));
      } else if (draftedCount > 0) {
        toast.success(
          t("toasts.scheduled_with_drafts", { scheduled: scheduledCount, drafts: draftedCount })
        );
      } else {
        toast.success(t("toasts.scheduled_count", { count: scheduledCount }));
      }
      router.push("/dashboard/schedule?view=list");
    } else if (scheduledCount + draftedCount > 0) {
      setScheduleAllFailedItems(failedUnits);
      toast.warning(
        t("toasts.scheduled_partial", {
          success: scheduledCount + draftedCount,
          failed: failedUnits.length,
        })
      );
    } else {
      setScheduleAllFailedItems(failedUnits);
      toast.error(t("toasts.schedule_failed"));
    }
  };

  const handleRetryFailed = async () => {
    setScheduleAllLoading(true);

    const stillFailed: ScheduleUnit[] = [];
    let retrySuccess = 0;
    let retryPlanLimit: PlanLimitPayload | null = null;

    for (let i = 0; i < scheduleAllFailedItems.length; i++) {
      const result = await scheduleUnit(scheduleAllFailedItems[i]!);
      if (result.ok) {
        retrySuccess++;
      } else {
        stillFailed.push(scheduleAllFailedItems[i]!);
        if (result.isPlanLimit) {
          retryPlanLimit = result.planLimitPayload ?? null;
          // Remaining retries will also fail — stop
          for (let j = i + 1; j < scheduleAllFailedItems.length; j++) {
            stillFailed.push(scheduleAllFailedItems[j]!);
          }
          break;
        }
      }
    }

    setScheduleAllLoading(false);

    if (retryPlanLimit) {
      setScheduleAllFailedItems(stillFailed);
      setScheduleAllPlanLimit(retryPlanLimit);
      toast.error(t("toasts.schedule_failed"));
      openWithContext({ feature: "posts", ...retryPlanLimit });
    } else if (stillFailed.length === 0) {
      setScheduleAllOpen(false);
      setScheduleAllFailedItems([]);
      toast.success(t("toasts.scheduled_count", { count: retrySuccess }));
      router.push("/dashboard/schedule?view=list");
    } else if (retrySuccess > 0) {
      setScheduleAllFailedItems(stillFailed);
      toast.warning(
        t("toasts.scheduled_partial", {
          success: retrySuccess,
          failed: stillFailed.length,
        })
      );
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

  // Build the actual posts Schedule-All would send (threads expand into separate
  // tweets for users without thread access), so dialog counts/labels are accurate.
  const scheduleUnits = (() => {
    if (items.length === 0 || !scheduleAllStartDate) return [] as ScheduleUnit[];
    const [y, mo, d] = scheduleAllStartDate.split("-").map(Number);
    if (!y || !mo || !d) return [] as ScheduleUnit[];
    return buildScheduleUnits(new Date(y, mo - 1, d, 0, 0, 0, 0));
  })();

  // Proactive schedule-horizon check: Free/Trial plans cap how far ahead posts can
  // be scheduled. Detect out-of-range units from the chosen start date BEFORE sending
  // so we route them to drafts instead of letting /api/posts 402 mid-loop.
  // Mirrors checkScheduleHorizonDetailed() in require-plan.ts (now + horizonDays).
  const horizonExceededCount = (() => {
    if (scheduleHorizonDays === null || scheduleUnits.length === 0) return 0;
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + scheduleHorizonDays);
    return scheduleUnits.filter((u) => u.scheduledAt > maxDate).length;
  })();
  const totalUnits = scheduleUnits.length;
  const horizonBlocked = horizonExceededCount > 0;
  const horizonFitsCount = totalUnits - horizonExceededCount;
  // Every unit is beyond the window (e.g. a far-future start date): nothing can be
  // scheduled, so we save them all as drafts rather than showing "Schedule 0…".
  const allOverflow = horizonBlocked && horizonFitsCount === 0;
  // Free fallback: threads will be posted as separate single tweets — disclose it.
  const threadItemCount = items.filter((i) => i.tweets.length > 1).length;
  const hasCollapsedThreads = !canScheduleThreads && threadItemCount > 0;

  return (
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
                                  {KNOWN_TONE_KEYS.has(item.tone)
                                    ? t(
                                        `tone_options.${item.tone}` as
                                          | "tone_options.professional"
                                          | "tone_options.casual"
                                          | "tone_options.educational"
                                          | "tone_options.inspirational"
                                          | "tone_options.humorous"
                                          | "tone_options.viral"
                                          | "tone_options.controversial"
                                      )
                                    : item.tone}
                                </Badge>
                                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                                  <Clock className="h-3 w-3" />
                                  {item.time}
                                </span>
                              </div>
                              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                {item.topic}
                              </p>
                              {item.tweets.length === 1 ? (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                  {item.tweets[0]}
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {item.tweets.map((tw, ti) => (
                                    <div
                                      key={ti}
                                      className="border-border/60 bg-muted/30 rounded-md border p-2.5"
                                    >
                                      <span className="text-muted-foreground mb-1 block text-[10px] font-semibold">
                                        {ti + 1}/{item.tweets.length}
                                      </span>
                                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                        {tw}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
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
                <div className="space-y-2 py-2 text-center">
                  <p className="text-sm font-semibold">{t("no_connected_accounts")}</p>
                  <a
                    href="/dashboard/settings"
                    className="text-primary hover:text-primary/80 inline-block text-sm font-medium underline underline-offset-2 transition-colors"
                  >
                    {t("connect_in_settings")}
                  </a>
                </div>
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

            {/* Thread fallback disclaimer: Free plans can't post threads, so each
                thread is expanded into separate single tweets */}
            {hasCollapsedThreads && (
              <div className="border-info-6 bg-info-3 flex items-start gap-2 rounded-md p-3">
                <Info className="text-info-11 mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div className="space-y-1.5">
                  <p className="text-info-11/90 text-xs leading-relaxed">
                    {t("thread_fallback_notice", { count: threadItemCount })}
                  </p>
                  <button
                    type="button"
                    className="text-info-11 text-xs font-semibold underline underline-offset-2"
                    onClick={() =>
                      openWithContext({
                        feature: "thread_access",
                        message: t("thread_fallback_notice", { count: threadItemCount }),
                        suggestedPlan: "pro_monthly",
                      })
                    }
                  >
                    {t("upgrade_for_threads")}
                  </button>
                </div>
              </div>
            )}

            {/* Schedule-horizon warning: out-of-window posts are saved as drafts, not lost */}
            {horizonBlocked && (
              <div className="border-warning-6 bg-warning-3 space-y-2.5 rounded-md border p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className="text-warning-11 mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <div className="space-y-0.5">
                    <p className="text-warning-11 text-sm font-semibold">
                      {t("horizon_alert_title")}
                    </p>
                    <p className="text-warning-11/90 text-xs leading-relaxed">
                      {t("horizon_alert_description", {
                        count: horizonExceededCount,
                        days: scheduleHorizonDays ?? 0,
                      })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-warning-6 text-warning-11 hover:bg-warning-4 w-full"
                  onClick={() =>
                    openWithContext({
                      feature: "schedule_horizon",
                      message: t("horizon_alert_description", {
                        count: horizonExceededCount,
                        days: scheduleHorizonDays ?? 0,
                      }),
                      limit: scheduleHorizonDays,
                      suggestedPlan: "pro_monthly",
                    })
                  }
                >
                  <Sparkles className="me-2 h-3.5 w-3.5" />
                  {t("upgrade_to_schedule")}
                </Button>
              </div>
            )}

            {/* Failed items */}
            {scheduleAllFailedItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-destructive text-xs font-semibold">
                  {t("failed_items_heading", { count: scheduleAllFailedItems.length })}
                </p>
                <ul className="border-destructive/20 bg-destructive/5 max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
                  {scheduleAllFailedItems.map((f, fi) => (
                    <li key={fi} className="text-muted-foreground text-xs">
                      {f.topic}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setScheduleAllOpen(false)}
              disabled={scheduleAllLoading}
            >
              {t("cancel")}
            </Button>
            {scheduleAllFailedItems.length > 0 ? (
              scheduleAllPlanLimit ? (
                <Button
                  variant="default"
                  onClick={() => openWithContext({ feature: "posts", ...scheduleAllPlanLimit! })}
                >
                  {t("upgrade_to_schedule")}
                </Button>
              ) : (
                <Button onClick={handleRetryFailed} disabled={scheduleAllLoading}>
                  {scheduleAllLoading ? (
                    <>
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      {t("scheduling")}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="me-2 h-4 w-4" />
                      {t("retry_failed", { count: scheduleAllFailedItems.length })}
                    </>
                  )}
                </Button>
              )
            ) : (
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
                ) : allOverflow ? (
                  <>
                    <CalendarCheck className="me-2 h-4 w-4" />
                    {t("save_all_as_drafts", { count: horizonExceededCount })}
                  </>
                ) : horizonBlocked ? (
                  <>
                    <CalendarCheck className="me-2 h-4 w-4" />
                    {t("schedule_with_drafts", {
                      scheduled: horizonFitsCount,
                      drafts: horizonExceededCount,
                    })}
                  </>
                ) : (
                  <>
                    <CalendarCheck className="me-2 h-4 w-4" />
                    {t("schedule_n_posts", { count: totalUnits })}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
