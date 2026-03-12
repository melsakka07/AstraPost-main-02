"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Clock, Calendar, Hash, Type, BarChart3, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
      if (!res.ok) {
        throw new Error("Failed to fetch analysis");
      }

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

  // Auto-fetch on mount
  useEffect(() => {
    fetchAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const formatPercent = (val: number) => `${(val * 100).toFixed(1)}%`;

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Viral Content Analyzer</h1>
            <p className="text-muted-foreground">
              Discover what makes your content go viral
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={(v) => { setDays(v); }}>
            <SelectTrigger className="w-[140px]">
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
          <Button onClick={fetchAnalysis} disabled={isLoading}>
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
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Insufficient Data */}
      {insufficientData && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Not enough tweet data to analyze. Publish more tweets (at least 5 with 100+ impressions) to get viral content insights.
          </AlertDescription>
        </Alert>
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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tweets Analyzed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analysis.overall.tweetsAnalyzed}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Engagement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatPercent(analysis.overall.avgEngagement)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Top Engagement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{formatPercent(analysis.overall.topEngagement)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Impressions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analysis.overall.totalImpressions.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI-Generated Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-sm" dangerouslySetInnerHTML={{ __html: insight.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Best Hashtags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Hash className="h-5 w-5" />
                  Top Hashtags
                </CardTitle>
                <CardDescription>
                  Hashtags that drive most engagement
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysis.hashtags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hashtag data yet</p>
                ) : (
                  <div className="space-y-3">
                    {analysis.hashtags.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{item.tag}</Badge>
                          <span className="text-xs text-muted-foreground">({item.count} tweets)</span>
                        </div>
                        <span className="text-sm font-medium">{formatPercent(item.avgEngagement)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Best Keywords */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Type className="h-5 w-5" />
                  Top Keywords
                </CardTitle>
                <CardDescription>
                  Word patterns that resonate with your audience
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysis.keywords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No keyword data yet</p>
                ) : (
                  <div className="space-y-3">
                    {analysis.keywords.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm italic">"{item.keyword}"</span>
                        <span className="text-sm font-medium">{formatPercent(item.avgEngagement)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Content Length */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  <BarChart3 className="h-5 w-5 inline mr-2" />
                  Tweet Length Performance
                </CardTitle>
                <CardDescription>
                  Which lengths perform best for you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis.length.map((item, i) => {
                    const maxAvg = analysis.length[0]?.avg ?? 1;
                    const percentage = (item.avg / maxAvg) * 100;

                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{item.category}</span>
                          <span className="font-medium">{formatPercent(item.avg)}</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                        <span className="text-xs text-muted-foreground">{item.count} tweets</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Best Times */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" />
                  Best Times to Post
                </CardTitle>
                <CardDescription>
                  When your content gets the most engagement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Best Days */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Best Days
                    </h4>
                    <div className="flex gap-2">
                      {analysis.bestDays.map((item, i) => (
                        <Badge key={i} variant="outline">
                          {item.day.slice(0, 3)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Best Hours */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Best Hours</h4>
                    <div className="flex gap-2 flex-wrap">
                      {analysis.bestHours.map((item, i) => (
                        <Badge key={i} variant="secondary">
                          {item.hour}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content Types */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  <Type className="h-5 w-5 inline mr-2" />
                  Content Type Performance
                </CardTitle>
                <CardDescription>
                  Which types of content work best for you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.contentTypes.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{item.type.replace(/_/g, " ")}</span>
                      <Badge variant={item.avgEngagement > analysis.overall.avgEngagement ? "default" : "secondary"}>
                        {formatPercent(item.avgEngagement)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
