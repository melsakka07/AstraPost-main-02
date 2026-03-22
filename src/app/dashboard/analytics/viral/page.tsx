"use client";

import { useState, useEffect } from "react";
import {
  AlertCircle,
  BarChart3,
  Clock,
  Hash,
  Loader2,
  Sparkles,
  TrendingUp,
  Type,
} from "lucide-react";
import { ViralBarChart } from "@/components/analytics/viral-bar-chart";
import { ViralHourChart } from "@/components/analytics/viral-hour-chart";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

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

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function ViralAnalyzerPage() {
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
      setError(
        err instanceof Error ? err.message : "Failed to analyze viral content"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const fmt = (val: number) => `${(val * 100).toFixed(1)}%`;

  return (
    <DashboardPageWrapper
      icon={TrendingUp}
      title="Viral Content Analyzer"
      description="Discover what makes your content go viral with AI-powered insights."
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyze
              </>
            )}
          </Button>
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
              Not enough tweet data to analyze. Publish more tweets (at least 5
              with 100+ impressions) to get viral content insights.
            </AlertDescription>
          </Alert>
          <div className="relative">
            <div className="pointer-events-none select-none opacity-40 blur-[2px]">
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { label: "Tweets Analyzed", value: "24" },
                  { label: "Avg Engagement", value: "3.2%" },
                  { label: "Top Engagement", value: "12.8%" },
                  { label: "Total Impressions", value: "48,320" },
                ].map((item) => (
                  <Card key={item.label}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
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
              <div className="rounded-xl border bg-background/95 px-8 py-6 text-center shadow-lg backdrop-blur-sm max-w-md">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Unlock Viral Insights</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Publish 5+ tweets with 100+ impressions to unlock AI-powered
                  analysis of your top-performing content patterns.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !analysis && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
          <div className="grid gap-4 md:grid-cols-4">
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
                value: analysis.overall.totalImpressions.toLocaleString(),
              },
            ].map((s) => (
              <Card key={s.label} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {s.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-3xl font-bold ${s.highlight ? "text-green-600" : ""}`}
                  >
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
                <Sparkles className="h-5 w-5 text-primary" />
                AI-Generated Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {analysis.insights.map((insight, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm leading-relaxed"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span
                      dangerouslySetInnerHTML={{
                        __html: insight.replace(
                          /\*\*(.*?)\*\*/g,
                          "<strong>$1</strong>"
                        ),
                      }}
                    />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* V1 — Top Hashtags */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Hash className="h-5 w-5 text-primary" />
                  Top Hashtags
                </CardTitle>
                <CardDescription>
                  Hashtags that drive the most engagement
                </CardDescription>
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
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Type className="h-5 w-5 text-primary" />
                  Top Keywords
                </CardTitle>
                <CardDescription>
                  Word patterns that resonate with your audience
                </CardDescription>
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
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Tweet Length Performance
                </CardTitle>
                <CardDescription>
                  Which lengths perform best for you
                </CardDescription>
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
                <p className="mt-2 text-xs text-muted-foreground text-right">
                  Short &lt;100 · Medium 100–200 · Long &gt;200 chars
                </p>
              </CardContent>
            </Card>

            {/* V3 — Best Days */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-primary" />
                  Best Days to Post
                </CardTitle>
                <CardDescription>
                  Days when your content gets the most engagement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ViralBarChart
                  data={[...analysis.bestDays]
                    .sort(
                      (a, b) =>
                        DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
                    )
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
            <Card className="hover:shadow-md transition-shadow lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-primary" />
                  Best Hours to Post
                </CardTitle>
                <CardDescription>
                  24-hour engagement — top 3 highlighted
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ViralHourChart
                  data={analysis.bestHours}
                  formatValue={fmt}
                  highlightTop={3}
                />
              </CardContent>
            </Card>

            {/* V5 — Content Types */}
            <Card className="hover:shadow-md transition-shadow lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Type className="h-5 w-5 text-primary" />
                  Content Type Performance
                </CardTitle>
                <CardDescription>
                  Which types of content work best for you
                </CardDescription>
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
                  height={Math.max(
                    160,
                    analysis.contentTypes.length * 36
                  )}
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
