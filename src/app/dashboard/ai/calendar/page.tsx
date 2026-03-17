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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";

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

export default function ContentCalendarPage() {
  const router = useRouter();
  const { openWithContext } = useUpgradeModal();

  const [niche, setNiche] = useState("");
  const [language, setLanguage] = useState("en");
  const [postsPerWeek, setPostsPerWeek] = useState(3);
  const [weeks, setWeeks] = useState(1);
  const [tone, setTone] = useState("professional");
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

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
    });
    router.push(`/dashboard/compose?${params.toString()}`);
  };

  // Group items by day
  const byDay = items.reduce<Record<string, CalendarItem[]>>((acc, item) => {
    if (!acc[item.day]) acc[item.day] = [];
    acc[item.day]!.push(item);
    return acc;
  }, {});

  return (
    <DashboardPageWrapper
      icon={CalendarDays}
      title="AI Content Calendar"
      description="Generate a full content plan for your niche — topics, times, tones, and briefs."
    >
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
                  <SelectItem value="tr">Turkish</SelectItem>
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Calendar
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Calendar Results */}
        <div className="lg:col-span-2 space-y-4">
          {items.length === 0 && !isGenerating ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <CalendarDays className="h-7 w-7 text-primary" />
              </div>
              <p className="font-semibold text-foreground">Your calendar will appear here</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                Enter your niche and preferences, then click Generate Calendar.
              </p>
            </div>
          ) : isGenerating ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-16 text-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Building your content calendar...</p>
            </div>
          ) : (
            Object.entries(byDay).map(([day, dayItems]) => (
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
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
