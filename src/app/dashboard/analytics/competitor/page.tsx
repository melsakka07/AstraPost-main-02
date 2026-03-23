"use client";

import { useState } from "react";
import { Users, Sparkles, Loader2, TrendingUp, Hash, MessageSquare, Lightbulb, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { ViralBarChart } from "@/components/analytics/viral-bar-chart";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function CompetitorAnalyzerPage() {
  const { openWithContext } = useUpgradeModal();

  const [username, setUsername] = useState("");
  const [language, setLanguage] = useState("en");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    const cleaned = username.replace(/^@/, "").trim();
    if (!cleaned) {
      toast.error("Please enter a username");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/analytics/competitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleaned, language }),
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
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Failed to analyze account");
        return;
      }

      const data = await res.json() as AnalysisResult;
      setResult(data);
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
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
                <><Loader2 className="me-2 h-4 w-4 animate-spin" />Analyzing...</>
              ) : (
                <><Sparkles className="me-2 h-4 w-4" />Analyze</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {!result && !isLoading && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <p className="font-semibold">Enter a public X username to analyze</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Analyze any public X account to discover their posting patterns, top topics, and engagement strategy.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="space-y-5" aria-busy="true" aria-label="Loading competitor analysis">
          {/* Metric card skeletons — mirrors 4-column result row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-2">
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
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-[180px] w-full rounded-md" />
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Strategic Summary skeleton */}
          <Card>
            <CardContent className="p-4 space-y-2">
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
                <CardContent className="p-4 space-y-3">
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
            <CardContent className="p-4 space-y-2">
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
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-lg border bg-background/95 px-4 py-2.5 backdrop-blur">
            <p className="text-sm font-medium truncate">
              @{result.username}
              <span className="ms-2 text-xs text-muted-foreground font-normal">
                {result.followerCount.toLocaleString()} followers · {result.tweetCount} tweets analyzed
              </span>
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setResult(null)}
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
              <p className="text-sm text-muted-foreground">
                {result.displayName} · {result.followerCount.toLocaleString()} followers · {result.tweetCount} tweets analyzed
              </p>
            </div>
          </div>

          {/* A3 — Visual metrics comparison */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Followers</p>
                <p className="text-2xl font-bold tabular-nums">{result.followerCount.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Tweets Analyzed</p>
                <p className="text-2xl font-bold tabular-nums">{result.tweetCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Content Types</p>
                <p className="text-2xl font-bold tabular-nums">{result.analysis.preferredContentTypes.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Top Hashtags</p>
                <p className="text-2xl font-bold tabular-nums">{result.analysis.topHashtags.length}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Hash className="h-4 w-4 text-primary" />
                  Hashtag Prominence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ViralBarChart
                  data={rankToChartData(result.analysis.topHashtags, "#")}
                  orientation="horizontal"
                  highlightTop={3}
                  height={200}
                  emptyText="No hashtags found"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-primary" />
                  Content Mix
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ViralBarChart
                  data={rankToChartData(result.analysis.preferredContentTypes)}
                  orientation="horizontal"
                  highlightTop={2}
                  height={200}
                  emptyText="No content types found"
                />
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Strategic Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{result.analysis.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 rounded-md border px-2 py-1">
                  📅 {result.analysis.postingFrequency}
                </span>
                <span className="flex items-center gap-1 rounded-md border px-2 py-1">
                  🕐 {result.analysis.bestPostingTimes}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Topics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Top Topics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {result.analysis.topTopics.map((t, i) => (
                    <Badge key={i} variant="secondary">{t}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Hashtags */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Hash className="h-4 w-4 text-primary" />
                  Top Hashtags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {result.analysis.topHashtags.map((h, i) => (
                    <Badge key={i} variant="outline">#{h.replace(/^#/, "")}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Key Strengths */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Key Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {result.analysis.keyStrengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 text-green-500">✓</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Differentiation Opportunities */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Your Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {result.analysis.differentiationOpportunities.map((o, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 text-primary">→</span>
                      {o}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Tone Profile */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Tone Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">{result.analysis.toneProfile}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {result.analysis.preferredContentTypes.map((t, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardPageWrapper>
  );
}
