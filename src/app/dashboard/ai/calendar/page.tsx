"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Sparkles,
  Loader2,
  Clock,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getWeekLabel(weekNum: number, baseDate: Date): string {
  const day = baseDate.getDay(); // 0=Sun
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + diffToMonday + (weekNum - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const sm = MONTH_NAMES[monday.getMonth()];
  const em = MONTH_NAMES[sunday.getMonth()];
  if (monday.getMonth() === sunday.getMonth()) {
    return `Week ${weekNum} · ${sm} ${monday.getDate()}–${sunday.getDate()}`;
  }
  return `Week ${weekNum} · ${sm} ${monday.getDate()}–${em} ${sunday.getDate()}`;
}

export default function ContentCalendarPage() {
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

  const handleGenerate = async () => {
    if (!niche.trim()) {
      toast.error("Please enter your niche or topic focus");
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
            payload = await res.json() as PlanLimitPayload;
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

      const data = await res.json() as { items: CalendarItem[] };
      setItems(data.items ?? []);
      setGeneratedAt(new Date());
    } catch {
      toast.error("Failed to generate calendar. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const openInComposer = (item: CalendarItem) => {
    const params = new URLSearchParams({
      prefill: item.brief,
      type: item.tweetType === "thread" ? "thread" : "tweet",
      // W5: Pass full metadata so Composer can show tone + topic hint
      tone: item.tone,
      topic: item.topic,
    });
    router.push(`/dashboard/compose?${params.toString()}`);
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

  return (
    <DashboardPageWrapper
      icon={CalendarDays}
      title="AI Content Calendar"
      description="Set your niche and schedule to get a week of AI-planned content — topics, tones, and posting times."
    >
      <Breadcrumb items={[{ label: "Content Calendar" }]} className="mb-2" />
      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        {/* Config Panel */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-base">Configure Calendar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="niche">Your Niche / Topic Focus</Label>
              <Input
                id="niche"
                placeholder="e.g. Islamic finance, tech entrepreneurship..."
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">Arabic</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="tr">Turkish</SelectItem>
                  <SelectItem value="ru">Russian</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Default Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="educational">Educational</SelectItem>
                  <SelectItem value="inspirational">Inspirational</SelectItem>
                  <SelectItem value="humorous">Humorous</SelectItem>
                  <SelectItem value="viral">Viral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Posts Per Week</Label>
                <span className="text-sm font-medium text-muted-foreground">{postsPerWeek}</span>
              </div>
              <Slider
                value={[postsPerWeek]}
                onValueChange={(v) => setPostsPerWeek(v[0] ?? 3)}
                min={1}
                max={7}
                step={1}
                aria-label="Posts per week"
                aria-valuetext={`${postsPerWeek} posts per week`}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Weeks to Plan</Label>
                <span className="text-sm font-medium text-muted-foreground">{weeks} week{weeks > 1 ? "s" : ""}</span>
              </div>
              <Slider
                value={[weeks]}
                onValueChange={(v) => setWeeks(v[0] ?? 1)}
                min={1}
                max={4}
                step={1}
                aria-label="Weeks to plan"
                aria-valuetext={`${weeks} ${weeks === 1 ? "week" : "weeks"}`}
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
                  Generating... ({elapsed}s)
                </>
              ) : (
                <>
                  <Sparkles className="me-2 h-4 w-4" />
                  Generate Calendar
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Calendar Results */}
        <div className="lg:col-span-2 space-y-4">
          {items.length === 0 && !isGenerating ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5 space-y-4">
              {/* Blurred weekly grid preview */}
              <div className="opacity-25 pointer-events-none select-none blur-[1.5px]" aria-hidden="true">
                <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                  {["Mon", "Tue", "Wed", "Thu"].map((d) => (
                    <div key={d} className="text-center text-[10px] text-muted-foreground font-semibold py-0.5">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="rounded-md border bg-card p-1.5 space-y-1">
                      <div className="h-2 bg-muted-foreground/30 rounded w-full" />
                      <div className="h-2 bg-muted-foreground/20 rounded w-3/4" />
                      <div className="mt-1 h-3.5 w-3.5 rounded-full bg-primary/20" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Your content calendar will appear here</p>
                <p className="mt-1 text-xs text-muted-foreground">Set your niche and schedule, then click Generate Calendar</p>
              </div>
            </div>
          ) : isGenerating ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-16 text-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Building your content calendar...</p>
            </div>
          ) : (
            byWeek.map(({ weekNum, byDay }) => (
              <div key={weekNum} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold">
                    {generatedAt ? getWeekLabel(weekNum, generatedAt) : `Week ${weekNum}`}
                  </h2>
                  <div className="flex-1 h-px bg-border" />
                </div>
                {Object.entries(byDay).map(([day, dayItems]) => (
                  <div key={day}>
                    <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
                      {day}
                    </h3>
                    <div className="space-y-2">
                      {dayItems.map((item, idx) => (
                        <Card key={idx} className="hover:border-primary/30 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 space-y-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                                      TWEET_TYPE_COLORS[item.tweetType] ?? ""
                                    }`}
                                  >
                                    {item.tweetType}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {item.tone}
                                  </Badge>
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {item.time}
                                  </span>
                                </div>
                                <p className="text-sm font-medium leading-snug">{item.topic}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {item.brief}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="shrink-0"
                                onClick={() => openInComposer(item)}
                                aria-label="Open in Composer"
                              >
                                <ChevronRight className="h-4 w-4" aria-hidden="true" />
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
    </DashboardPageWrapper>
  );
}
