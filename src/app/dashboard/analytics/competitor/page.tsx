"use client";

import { useState } from "react";
import {
  Users,
  Sparkles,
  Loader2,
  TrendingUp,
  Hash,
  MessageSquare,
  Lightbulb,
  LayoutGrid,
  ChevronDown,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import { ViralBarChart } from "@/components/analytics/viral-bar-chart";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";

/** Assign rank-decay scores: 1st item → 100, 2nd → 85, 3rd → 72 … */
function rankToChartData(items: string[], prefix = ""): { name: string; value: number }[] {
  return items.map((item, i) => ({
    name: `${prefix}${item.replace(new RegExp(`^${prefix}`), "")}`,
    value: Math.round(100 * Math.pow(0.85, i)),
  }));
}

interface AnalysisResult {
  username: string;
  displayName: string;
  followerCount: number;
  tweetCount: number;
  analysis: {
    topTopics: string[];
    postingFrequency: string;
    preferredContentTypes: string[];
    toneProfile: string;
    topHashtags: string[];
    bestPostingTimes: string;
    keyStrengths: string[];
    differentiationOpportunities: string[];
    summary: string;
  };
}

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

interface SelfStats {
  hasData: boolean;
  tweetsAnalyzed?: number;
  postingFrequency?: string;
  topHashtags?: string[];
  preferredContentTypes?: string[];
}

export default function CompetitorAnalyzerPage() {
  const { openWithContext } = useUpgradeModal();

  const [username, setUsername] = useState("");
  const [language, setLanguage] = useState("en");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // A33 — self-comparison state
  const [selfStats, setSelfStats] = useState<SelfStats | null>(null);

  // C4 — collapsible sections (all open by default)
  const [compareOpen, setCompareOpen] = useState(true);
  const [chartsOpen, setChartsOpen] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [toneOpen, setToneOpen] = useState(true);

  const handleAnalyze = async () => {
    const cleaned = username.replace(/^@/, "").trim();
    if (!cleaned) {
      toast.error("Please enter a username");
      return;
    }

    setIsLoading(true);
    setResult(null);
    setSelfStats(null);

    try {
      // A33 — fetch competitor analysis and user's own stats in parallel
      const [competitorRes, selfRes] = await Promise.all([
        fetch("/api/analytics/competitor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: cleaned, language }),
        }),
        fetch("/api/analytics/self-stats"),
      ]);

      if (!competitorRes.ok) {
        if (competitorRes.status === 402) {
          let payload: PlanLimitPayload | null = null;
          try {
            payload = (await competitorRes.json()) as PlanLimitPayload;
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
        const err = (await competitorRes.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? "Failed to analyze account");
        return;
      }

      const data = (await competitorRes.json()) as AnalysisResult;
      setResult(data);

      // Self-stats are best-effort: silently ignore errors
      if (selfRes.ok) {
        setSelfStats((await selfRes.json()) as SelfStats);
      } else {
        setSelfStats({ hasData: false });
      }
    } catch {
      toast.error("Failed to analyze account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardPageWrapper
      icon={Users}
      title="Competitor Analyzer"
      description="Enter a public X username to uncover their posting strategy, top topics, and where you can stand out."
    >
      {/* Input */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="username">X Username</Label>
              <div className="relative">
                <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                  @
                </span>
                <Input
                  id="username"
                  placeholder="username"
                  value={username.replace(/^@/, "")}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-7"
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:w-36">
              <Label>Analysis Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">Arabic</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={isLoading || !username.trim()}
              className="sm:self-end"
            >
              {isLoading ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="me-2 h-4 w-4" />
                  Analyze
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {!result && !isLoading && (
        <div className="border-border bg-muted/20 flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center">
          <div className="bg-primary/10 mb-4 flex h-14 w-14 items-center justify-center rounded-full">
            <Users className="text-primary h-7 w-7" />
          </div>
          <p className="font-semibold">Enter a public X username to analyze</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Analyze any public X account to discover their posting patterns, top topics, and
            engagement strategy.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="space-y-5" aria-busy="true" aria-label="Loading competitor analysis">
          {/* Metric card skeletons — mirrors 4-column result row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="space-y-2 p-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Chart skeletons — mirrors Hashtag Prominence + Content Mix */}
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="space-y-3 p-4">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-[180px] w-full rounded-md" />
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Strategic Summary skeleton */}
          <Card>
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-6 w-32 rounded-md" />
                <Skeleton className="h-6 w-28 rounded-md" />
              </div>
            </CardContent>
          </Card>
          {/* Text card skeletons — mirrors Topics / Hashtags / Key Strengths / Opportunities 2×2 grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="space-y-3 p-4">
                  <Skeleton className="h-4 w-28" />
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: 4 }).map((__, j) => (
                      <Skeleton key={j} className="h-5 w-16 rounded-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Tone Profile skeleton */}
          <Card>
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <div className="flex gap-1.5 pt-1">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {result && (
        <div className="space-y-5">
          {/* A34 — Sticky "Analyze Another" bar so the input doesn't need re-scrolling */}
          <div className="bg-background/95 sticky top-0 z-10 flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 backdrop-blur">
            <p className="truncate text-sm font-medium">
              @{result.username}
              <span className="text-muted-foreground ms-2 text-xs font-normal">
                {result.followerCount.toLocaleString()} followers · {result.tweetCount} tweets
                analyzed
              </span>
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setResult(null);
                setSelfStats(null);
              }}
              className="shrink-0"
            >
              <Sparkles className="me-1.5 h-3.5 w-3.5" />
              Analyze Another
            </Button>
          </div>

          {/* Header */}
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-xl font-bold">@{result.username}</h2>
              <p className="text-muted-foreground text-sm">
                {result.displayName} · {result.followerCount.toLocaleString()} followers ·{" "}
                {result.tweetCount} tweets analyzed
              </p>
            </div>
          </div>

          {/* A3 — Visual metrics comparison */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-muted-foreground mb-1 text-xs">Followers</p>
                <p className="text-2xl font-bold tabular-nums">
                  {result.followerCount.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-muted-foreground mb-1 text-xs">Tweets Analyzed</p>
                <p className="text-2xl font-bold tabular-nums">{result.tweetCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-muted-foreground mb-1 text-xs">Content Types</p>
                <p className="text-2xl font-bold tabular-nums">
                  {result.analysis.preferredContentTypes.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-muted-foreground mb-1 text-xs">Top Hashtags</p>
                <p className="text-2xl font-bold tabular-nums">
                  {result.analysis.topHashtags.length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* A33 — Compare with Your Account */}
          <Card>
            <button
              type="button"
              onClick={() => setCompareOpen((v) => !v)}
              className="hover:bg-muted/30 flex w-full items-center justify-between rounded-t-lg px-5 py-3.5 text-start transition-colors"
              aria-expanded={compareOpen}
              aria-controls="competitor-compare-panel"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <ArrowLeftRight className="text-primary h-4 w-4" />
                Compare with Your Account
              </span>
              <ChevronDown
                className={`text-muted-foreground h-4 w-4 transition-transform duration-200 ${compareOpen ? "" : "-rotate-90"}`}
              />
            </button>
            {compareOpen && (
              <CardContent id="competitor-compare-panel" className="px-5 pt-0 pb-5">
                {selfStats === null ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                    <Skeleton className="h-16 w-full rounded-lg" />
                    <Skeleton className="h-16 w-full rounded-lg" />
                  </div>
                ) : !selfStats.hasData ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="bg-muted mb-3 flex h-10 w-10 items-center justify-center rounded-full">
                      <ArrowLeftRight className="text-muted-foreground h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium">No data to compare yet</p>
                    <p className="text-muted-foreground mt-1 max-w-xs text-xs">
                      Publish posts from AstraPost to see how you stack up against @
                      {result.username}.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Column headers */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/40 rounded-lg border px-3 py-2 text-center">
                        <p className="text-xs font-semibold">Your Account</p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {selfStats.tweetsAnalyzed} tweets · last 90 days
                        </p>
                      </div>
                      <div className="bg-muted/40 rounded-lg border px-3 py-2 text-center">
                        <p className="text-xs font-semibold">@{result.username}</p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {result.tweetCount} tweets analyzed
                        </p>
                      </div>
                    </div>

                    {/* Posting Frequency */}
                    <div>
                      <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium">
                        <TrendingUp className="text-primary h-3.5 w-3.5" />
                        Posting Frequency
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border px-3 py-2.5 text-center">
                          <p className="text-sm font-semibold">{selfStats.postingFrequency}</p>
                        </div>
                        <div className="rounded-lg border px-3 py-2.5 text-center">
                          <p className="text-sm font-semibold">
                            {result.analysis.postingFrequency}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Top Hashtags */}
                    {(() => {
                      const myTags = (selfStats.topHashtags ?? []).slice(0, 6);
                      const theirTags = result.analysis.topHashtags.slice(0, 6);
                      const mySet = new Set(myTags.map((t) => t.toLowerCase().replace(/^#/, "")));
                      const theirSet = new Set(
                        theirTags.map((t) => t.toLowerCase().replace(/^#/, ""))
                      );
                      const hasOverlap = myTags.some((t) =>
                        theirSet.has(t.toLowerCase().replace(/^#/, ""))
                      );
                      return (
                        <div>
                          <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium">
                            <Hash className="text-primary h-3.5 w-3.5" />
                            Top Hashtags
                            {hasOverlap && (
                              <span className="text-muted-foreground ms-auto flex items-center gap-1 text-xs">
                                <span className="bg-primary/70 inline-block h-2 w-2 rounded-full" />
                                shared tags highlighted
                              </span>
                            )}
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex min-h-[44px] flex-wrap gap-1.5 rounded-lg border p-2.5">
                              {myTags.length === 0 ? (
                                <span className="text-muted-foreground text-xs">
                                  No hashtags yet
                                </span>
                              ) : (
                                myTags.map((tag, i) => {
                                  const norm = tag.toLowerCase().replace(/^#/, "");
                                  return (
                                    <Badge
                                      key={i}
                                      variant={theirSet.has(norm) ? "default" : "outline"}
                                      className="text-xs"
                                    >
                                      #{norm}
                                    </Badge>
                                  );
                                })
                              )}
                            </div>
                            <div className="flex min-h-[44px] flex-wrap gap-1.5 rounded-lg border p-2.5">
                              {theirTags.length === 0 ? (
                                <span className="text-muted-foreground text-xs">
                                  No hashtags found
                                </span>
                              ) : (
                                theirTags.map((tag, i) => {
                                  const norm = tag.toLowerCase().replace(/^#/, "");
                                  return (
                                    <Badge
                                      key={i}
                                      variant={mySet.has(norm) ? "default" : "outline"}
                                      className="text-xs"
                                    >
                                      #{norm}
                                    </Badge>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Content Types */}
                    {(() => {
                      const myTypes = (selfStats.preferredContentTypes ?? []).slice(0, 5);
                      const theirTypes = result.analysis.preferredContentTypes.slice(0, 5);
                      const mySet = new Set(myTypes.map((t) => t.toLowerCase()));
                      const theirSet = new Set(theirTypes.map((t) => t.toLowerCase()));
                      return (
                        <div>
                          <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium">
                            <LayoutGrid className="text-primary h-3.5 w-3.5" />
                            Content Types
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex min-h-[44px] flex-wrap gap-1.5 rounded-lg border p-2.5">
                              {myTypes.length === 0 ? (
                                <span className="text-muted-foreground text-xs">No data yet</span>
                              ) : (
                                myTypes.map((type, i) => (
                                  <Badge
                                    key={i}
                                    variant={
                                      theirSet.has(type.toLowerCase()) ? "default" : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {type}
                                  </Badge>
                                ))
                              )}
                            </div>
                            <div className="flex min-h-[44px] flex-wrap gap-1.5 rounded-lg border p-2.5">
                              {theirTypes.length === 0 ? (
                                <span className="text-muted-foreground text-xs">No data found</span>
                              ) : (
                                theirTypes.map((type, i) => (
                                  <Badge
                                    key={i}
                                    variant={
                                      mySet.has(type.toLowerCase()) ? "default" : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {type}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Best Posting Times */}
                    <div>
                      <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium">
                        <MessageSquare className="text-primary h-3.5 w-3.5" />
                        Best Posting Times
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border px-3 py-2.5">
                          <p className="text-muted-foreground mb-1 text-xs">Your account</p>
                          <p className="text-muted-foreground text-sm italic">
                            See Best Time Predictor for details
                          </p>
                        </div>
                        <div className="rounded-lg border px-3 py-2.5">
                          <p className="text-muted-foreground mb-1 text-xs">@{result.username}</p>
                          <p className="text-sm">{result.analysis.bestPostingTimes}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Charts — collapsible */}
          <Card>
            <button
              type="button"
              onClick={() => setChartsOpen((v) => !v)}
              className="hover:bg-muted/30 flex w-full items-center justify-between rounded-t-lg px-5 py-3.5 text-start transition-colors"
              aria-expanded={chartsOpen}
              aria-controls="competitor-charts-panel"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <LayoutGrid className="text-primary h-4 w-4" />
                Charts
              </span>
              <ChevronDown
                className={`text-muted-foreground h-4 w-4 transition-transform duration-200 ${chartsOpen ? "" : "-rotate-90"}`}
              />
            </button>
            {chartsOpen && (
              <CardContent id="competitor-charts-panel" className="px-5 pt-0 pb-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium">
                      <Hash className="text-primary h-3.5 w-3.5" />
                      Hashtag Prominence
                    </p>
                    <ViralBarChart
                      data={rankToChartData(result.analysis.topHashtags, "#")}
                      orientation="horizontal"
                      highlightTop={3}
                      height={200}
                      emptyText="No hashtags found"
                    />
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium">
                      <LayoutGrid className="text-primary h-3.5 w-3.5" />
                      Content Mix
                    </p>
                    <ViralBarChart
                      data={rankToChartData(result.analysis.preferredContentTypes)}
                      orientation="horizontal"
                      highlightTop={2}
                      height={200}
                      emptyText="No content types found"
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Strategic Summary — collapsible */}
          <Card>
            <button
              type="button"
              onClick={() => setSummaryOpen((v) => !v)}
              className="hover:bg-muted/30 flex w-full items-center justify-between rounded-t-lg px-5 py-3.5 text-start transition-colors"
              aria-expanded={summaryOpen}
              aria-controls="competitor-summary-panel"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="text-primary h-4 w-4" />
                Strategic Summary
              </span>
              <ChevronDown
                className={`text-muted-foreground h-4 w-4 transition-transform duration-200 ${summaryOpen ? "" : "-rotate-90"}`}
              />
            </button>
            {summaryOpen && (
              <CardContent id="competitor-summary-panel" className="px-5 pt-0 pb-4">
                <p className="text-sm leading-relaxed">{result.analysis.summary}</p>
                <div className="text-muted-foreground mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="flex items-center gap-1 rounded-md border px-2 py-1">
                    📅 {result.analysis.postingFrequency}
                  </span>
                  <span className="flex items-center gap-1 rounded-md border px-2 py-1">
                    🕐 {result.analysis.bestPostingTimes}
                  </span>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Insights grid — collapsible */}
          <Card>
            <button
              type="button"
              onClick={() => setInsightsOpen((v) => !v)}
              className="hover:bg-muted/30 flex w-full items-center justify-between rounded-t-lg px-5 py-3.5 text-start transition-colors"
              aria-expanded={insightsOpen}
              aria-controls="competitor-insights-panel"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="text-primary h-4 w-4" />
                Topics, Hashtags & Insights
              </span>
              <ChevronDown
                className={`text-muted-foreground h-4 w-4 transition-transform duration-200 ${insightsOpen ? "" : "-rotate-90"}`}
              />
            </button>
            {insightsOpen && (
              <CardContent id="competitor-insights-panel" className="px-5 pt-0 pb-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Topics */}
                  <div>
                    <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium">
                      <TrendingUp className="text-primary h-3.5 w-3.5" />
                      Top Topics
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.analysis.topTopics.map((t, i) => (
                        <Badge key={i} variant="secondary">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Hashtags */}
                  <div>
                    <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium">
                      <Hash className="text-primary h-3.5 w-3.5" />
                      Top Hashtags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.analysis.topHashtags.map((h, i) => (
                        <Badge key={i} variant="outline">
                          #{h.replace(/^#/, "")}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Key Strengths */}
                  <div>
                    <p className="text-muted-foreground mb-2 text-xs font-medium">Key Strengths</p>
                    <ul className="space-y-1.5">
                      {result.analysis.keyStrengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-0.5 text-green-500">✓</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Differentiation Opportunities */}
                  <div>
                    <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium">
                      <Lightbulb className="text-primary h-3.5 w-3.5" />
                      Your Opportunities
                    </p>
                    <ul className="space-y-1.5">
                      {result.analysis.differentiationOpportunities.map((o, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-0.5">→</span>
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Tone Profile — collapsible */}
          <Card>
            <button
              type="button"
              onClick={() => setToneOpen((v) => !v)}
              className="hover:bg-muted/30 flex w-full items-center justify-between rounded-t-lg px-5 py-3.5 text-start transition-colors"
              aria-expanded={toneOpen}
              aria-controls="competitor-tone-panel"
            >
              <span className="text-sm font-semibold">Tone Profile</span>
              <ChevronDown
                className={`text-muted-foreground h-4 w-4 transition-transform duration-200 ${toneOpen ? "" : "-rotate-90"}`}
              />
            </button>
            {toneOpen && (
              <CardContent id="competitor-tone-panel" className="px-5 pt-0 pb-4">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {result.analysis.toneProfile}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {result.analysis.preferredContentTypes.map((t, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </DashboardPageWrapper>
  );
}
