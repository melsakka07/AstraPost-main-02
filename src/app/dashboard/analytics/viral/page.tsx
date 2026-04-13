"use client";

import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Hash,
  Loader2,
  Sparkles,
  TrendingUp,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import { ViralBarChart } from "@/components/analytics/viral-bar-chart";
import { ViralHourChart } from "@/components/analytics/viral-hour-chart";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserLocale } from "@/hooks/use-user-locale";

interface ViralAnalysis {
  overall: {
    avgEngagement: number;
    topEngagement: number;
    totalImpressions: number;
    tweetsAnalyzed: number;
    periodDays: number;
  };
  hashtags: Array<{ tag: string; avgEngagement: number; count: number }>;
  keywords: Array<{ keyword: string; avgEngagement: number; count: number }>;
  length: Array<{ category: string; avg: number; count: number }>;
  bestDays: Array<{ day: string; avgEngagement: number; count: number }>;
  bestHours: Array<{ hour: string; avgEngagement: number; count: number }>;
  contentTypes: Array<{ type: string; avgEngagement: number; count: number }>;
  insights: string[];
}

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Safely render **bold** markdown syntax as React nodes (no XSS risk). */
function safeBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}

export default function ViralAnalyzerPage() {
  const userLocale = useUserLocale();
  const [days, setDays] = useState("90");
  const [analysis, setAnalysis] = useState<ViralAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insufficientData, setInsufficientData] = useState(false);

  const fetchAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setInsufficientData(false);

    try {
      const res = await fetch(`/api/analytics/viral?days=${days}`);
      if (!res.ok) throw new Error("Failed to fetch analysis");
      const data = await res.json();
      if (data.insufficientData) {
        setInsufficientData(true);
      } else {
        setAnalysis(data.analysis);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze viral content");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const fmt = (val: number) => `${(val * 100).toFixed(1)}%`;

  const handleCopyMarkdown = () => {
    if (!analysis) return;
    const lines: string[] = [
      `# Viral Content Analysis — Last ${days} Days`,
      `_Generated: ${new Date().toLocaleDateString(userLocale)}_`,
      "",
      "## Overview",
      `- **Tweets Analyzed:** ${analysis.overall.tweetsAnalyzed}`,
      `- **Avg Engagement:** ${fmt(analysis.overall.avgEngagement)}`,
      `- **Top Engagement:** ${fmt(analysis.overall.topEngagement)}`,
      `- **Total Impressions:** ${analysis.overall.totalImpressions.toLocaleString(userLocale)}`,
      "",
      "## AI Insights",
      ...analysis.insights.map((ins) => `- ${ins.replace(/\*\*/g, "**")}`),
      "",
    ];

    if (analysis.hashtags.length > 0) {
      lines.push(
        "## Top Hashtags",
        "| Hashtag | Avg Engagement | Tweets |",
        "|---------|---------------|--------|"
      );
      analysis.hashtags
        .slice(0, 8)
        .forEach((h) => lines.push(`| #${h.tag} | ${fmt(h.avgEngagement)} | ${h.count} |`));
      lines.push("");
    }
    if (analysis.keywords.length > 0) {
      lines.push(
        "## Top Keywords",
        "| Keyword | Avg Engagement | Tweets |",
        "|---------|---------------|--------|"
      );
      analysis.keywords
        .slice(0, 8)
        .forEach((k) => lines.push(`| "${k.keyword}" | ${fmt(k.avgEngagement)} | ${k.count} |`));
      lines.push("");
    }
    if (analysis.bestDays.length > 0) {
      lines.push(
        "## Best Days",
        "| Day | Avg Engagement | Tweets |",
        "|-----|---------------|--------|"
      );
      [...analysis.bestDays]
        .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day))
        .forEach((d) => lines.push(`| ${d.day} | ${fmt(d.avgEngagement)} | ${d.count} |`));
      lines.push("");
    }
    if (analysis.length.length > 0) {
      lines.push(
        "## Tweet Length Performance",
        "| Length | Avg Engagement | Tweets |",
        "|--------|---------------|--------|"
      );
      analysis.length.forEach((l) => lines.push(`| ${l.category} | ${fmt(l.avg)} | ${l.count} |`));
    }

    void navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Report copied to clipboard");
  };

  const handleDownloadCSV = () => {
    if (!analysis) return;
    const rows = [
      "section,name,avg_engagement,count",
      `overview,tweets_analyzed,${analysis.overall.tweetsAnalyzed},`,
      `overview,avg_engagement,${fmt(analysis.overall.avgEngagement)},`,
      `overview,top_engagement,${fmt(analysis.overall.topEngagement)},`,
      `overview,total_impressions,${analysis.overall.totalImpressions},`,
      ...analysis.hashtags.map((h) => `hashtags,#${h.tag},${fmt(h.avgEngagement)},${h.count}`),
      ...analysis.keywords.map((k) => `keywords,"${k.keyword}",${fmt(k.avgEngagement)},${k.count}`),
      ...analysis.length.map((l) => `length,${l.category},${fmt(l.avg)},${l.count}`),
      ...analysis.bestDays.map((d) => `best_days,${d.day},${fmt(d.avgEngagement)},${d.count}`),
      ...analysis.bestHours.map((h) => `best_hours,${h.hour},${fmt(h.avgEngagement)},${h.count}`),
      ...analysis.contentTypes.map(
        (c) => `content_types,${c.type},${fmt(c.avgEngagement)},${c.count}`
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `viral-analysis-${days}d-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  return (
    <DashboardPageWrapper
      icon={TrendingUp}
      title="Viral Content Analyzer"
      description="Analyze your last 90 days of posts to find viral patterns — best hashtags, ideal timing, and top content types."
      actions={
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 180 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchAnalysis} disabled={isLoading} size="default">
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
          {analysis && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="default">
                  <Download className="me-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopyMarkdown}>
                  <Copy className="me-2 h-4 w-4" />
                  Copy as Markdown
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadCSV}>
                  <Download className="me-2 h-4 w-4" />
                  Download CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      }
    >
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Insufficient Data — Preview Mockup */}
      {insufficientData && (
        <div className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Not enough tweet data to analyze. Publish more tweets (at least 5 with 100+
              impressions) to get viral content insights.
            </AlertDescription>
          </Alert>
          <div className="relative">
            <div className="pointer-events-none opacity-40 blur-[2px] select-none">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                {[
                  { label: "Tweets Analyzed", value: "24" },
                  { label: "Avg Engagement", value: "3.2%" },
                  { label: "Top Engagement", value: "12.8%" },
                  { label: "Total Impressions", value: "48,320" },
                ].map((item) => (
                  <Card key={item.label}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-muted-foreground text-sm font-medium">
                        {item.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{item.value}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-background/95 max-w-md rounded-xl border px-8 py-6 text-center shadow-lg backdrop-blur-sm">
                <div className="bg-primary/10 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                  <TrendingUp className="text-primary h-6 w-6" />
                </div>
                <h2 className="text-lg font-semibold">Unlock Viral Insights</h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  Publish 5+ tweets with 100+ impressions to unlock AI-powered analysis of your
                  top-performing content patterns.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !analysis && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {[
              {
                label: "Tweets Analyzed",
                value: String(analysis.overall.tweetsAnalyzed),
              },
              {
                label: "Avg Engagement",
                value: fmt(analysis.overall.avgEngagement),
              },
              {
                label: "Top Engagement",
                value: fmt(analysis.overall.topEngagement),
                highlight: true,
              },
              {
                label: "Total Impressions",
                value: analysis.overall.totalImpressions.toLocaleString(userLocale),
              },
            ].map((s) => (
              <Card key={s.label} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-muted-foreground text-sm font-medium">
                    {s.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${s.highlight ? "text-green-600" : ""}`}>
                    {s.value}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="text-primary h-5 w-5" />
                AI-Generated Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {analysis.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                    <span className="bg-primary mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>{safeBold(insight)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Action Plan — synthesised from analysis data */}
          {(() => {
            const bestDay = [...analysis.bestDays].sort(
              (a, b) => b.avgEngagement - a.avgEngagement
            )[0];
            const bestHour = [...analysis.bestHours].sort(
              (a, b) => b.avgEngagement - a.avgEngagement
            )[0];
            const topHashtag = analysis.hashtags[0];
            const bestLength = [...analysis.length].sort((a, b) => b.avg - a.avg)[0];

            const actions: Array<{
              icon: React.ComponentType<{ className?: string }>;
              text: React.ReactNode;
            }> = [];

            if (bestDay && bestHour) {
              actions.push({
                icon: Clock,
                text: (
                  <>
                    Post on{" "}
                    <strong>
                      {bestDay.day}s at {bestHour.hour}
                    </strong>{" "}
                    — your engagement is highest then.
                  </>
                ),
              });
            }

            if (topHashtag) {
              actions.push({
                icon: Hash,
                text: (
                  <>
                    Include <strong>#{topHashtag.tag}</strong> — your top hashtag by engagement
                    rate.
                  </>
                ),
              });
            }

            if (bestLength) {
              actions.push({
                icon: Type,
                text: (
                  <>
                    Write <strong>{bestLength.category.toLowerCase()}</strong> tweets — they get the
                    most engagement in your account.
                  </>
                ),
              });
            }

            if (actions.length === 0) return null;

            return (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle2 className="text-primary h-5 w-5" />
                    Your Action Plan
                  </CardTitle>
                  <CardDescription>
                    3 specific steps to improve your engagement based on your data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-3">
                    {actions.map((action, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <div className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                          {i + 1}
                        </div>
                        <span className="pt-0.5 leading-relaxed">{action.text}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            );
          })()}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* V1 — Top Hashtags */}
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Hash className="text-primary h-5 w-5" />
                  Top Hashtags
                </CardTitle>
                <CardDescription>Hashtags that drive the most engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <ViralBarChart
                  data={analysis.hashtags.slice(0, 8).map((h) => ({
                    name: h.tag,
                    value: h.avgEngagement,
                    count: h.count,
                  }))}
                  orientation="horizontal"
                  highlightTop={3}
                  formatValue={fmt}
                  height={Math.max(160, analysis.hashtags.slice(0, 8).length * 34)}
                  emptyText="No hashtag data yet"
                />
              </CardContent>
            </Card>

            {/* V6 — Top Keywords */}
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Type className="text-primary h-5 w-5" />
                  Top Keywords
                </CardTitle>
                <CardDescription>Word patterns that resonate with your audience</CardDescription>
              </CardHeader>
              <CardContent>
                <ViralBarChart
                  data={analysis.keywords.slice(0, 8).map((k) => ({
                    name: `"${k.keyword}"`,
                    value: k.avgEngagement,
                    count: k.count,
                  }))}
                  orientation="horizontal"
                  highlightTop={3}
                  formatValue={fmt}
                  height={Math.max(160, analysis.keywords.slice(0, 8).length * 34)}
                  emptyText="No keyword data yet"
                />
              </CardContent>
            </Card>

            {/* V4 — Tweet Length Performance */}
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="text-primary h-5 w-5" />
                  Tweet Length Performance
                </CardTitle>
                <CardDescription>Which lengths perform best for you</CardDescription>
              </CardHeader>
              <CardContent>
                <ViralBarChart
                  data={analysis.length.map((l) => ({
                    name: l.category,
                    value: l.avg,
                    count: l.count,
                  }))}
                  orientation="vertical"
                  highlightTop={1}
                  formatValue={fmt}
                  height={200}
                  emptyText="No length data yet"
                />
                <p className="text-muted-foreground mt-2 text-right text-xs">
                  Short &lt;100 · Medium 100–200 · Long &gt;200 chars
                </p>
              </CardContent>
            </Card>

            {/* V3 — Best Days */}
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="text-primary h-5 w-5" />
                  Best Days to Post
                </CardTitle>
                <CardDescription>Days when your content gets the most engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <ViralBarChart
                  data={[...analysis.bestDays]
                    .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day))
                    .map((d) => ({
                      name: d.day.slice(0, 3),
                      value: d.avgEngagement,
                      count: d.count,
                    }))}
                  orientation="vertical"
                  highlightTop={2}
                  formatValue={fmt}
                  height={200}
                  emptyText="No day data yet"
                />
              </CardContent>
            </Card>

            {/* V2 — Best Hours */}
            <Card className="transition-shadow hover:shadow-md lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="text-primary h-5 w-5" />
                  Best Hours to Post
                </CardTitle>
                <CardDescription>24-hour engagement — top 3 highlighted</CardDescription>
              </CardHeader>
              <CardContent>
                <ViralHourChart data={analysis.bestHours} formatValue={fmt} highlightTop={3} />
              </CardContent>
            </Card>

            {/* V5 — Content Types */}
            <Card className="transition-shadow hover:shadow-md lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Type className="text-primary h-5 w-5" />
                  Content Type Performance
                </CardTitle>
                <CardDescription>Which types of content work best for you</CardDescription>
              </CardHeader>
              <CardContent>
                <ViralBarChart
                  data={[...analysis.contentTypes]
                    .sort((a, b) => b.avgEngagement - a.avgEngagement)
                    .map((c) => ({
                      name: c.type.replace(/_/g, " "),
                      value: c.avgEngagement,
                      count: c.count,
                    }))}
                  orientation="horizontal"
                  highlightTop={2}
                  formatValue={fmt}
                  height={Math.max(160, analysis.contentTypes.length * 36)}
                  emptyText="No content type data yet"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </DashboardPageWrapper>
  );
}
