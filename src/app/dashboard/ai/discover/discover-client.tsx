"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Loader2, AlertCircle, Youtube, TrendingUp, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { TrendResultCard } from "@/components/ai/discover/trend-result-card";
import { YoutubeResultCard } from "@/components/ai/discover/youtube-result-card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TrendItem } from "@/lib/schemas/common";
import type { YouTubeSearchResult } from "@/lib/schemas/youtube-search";

type SortOrder = "relevance" | "viewCount" | "date";

const SORT_OPTIONS: SortOrder[] = ["relevance", "viewCount", "date"];

interface DiscoverClientProps {
  maxYoutubeDurationSeconds: number;
}

export function DiscoverClient({ maxYoutubeDurationSeconds }: DiscoverClientProps) {
  const t = useTranslations("ai_discovery");

  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<SortOrder>("relevance");
  const [results, setResults] = useState<YouTubeSearchResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  // Abort any in-flight request on unmount (canonical polling/fetch pattern).
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const runSearch = useCallback(
    async (searchQuery: string, searchOrder: SortOrder) => {
      const trimmed = searchQuery.trim();
      if (trimmed.length < 2) {
        setError(t("query_too_short"));
        return;
      }

      // Abort any in-flight request before starting a new one.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 8_000);

      setIsLoading(true);
      setError("");

      try {
        const res = await fetch("/api/ai/discover/youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed, order: searchOrder }),
          signal: controller.signal,
        });

        if (!res.ok) {
          setResults(null);
          setError(res.status === 429 ? t("error_rate_limited") : t("error_generic"));
          return;
        }

        const data = (await res.json()) as { results: YouTubeSearchResult[] };
        setResults(Array.isArray(data.results) ? data.results : []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setResults(null);
        setError(t("error_generic"));
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [t]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void runSearch(query, order);
    },
    [runSearch, query, order]
  );

  const handleOrderChange = useCallback(
    (value: string) => {
      const next = value as SortOrder;
      setOrder(next);
      // Re-run the search with the new sort if we already have results.
      if (query.trim().length >= 2) {
        void runSearch(query, next);
      }
    },
    [runSearch, query]
  );

  // ─── X Trends tab (separate state — never shared with the YouTube tab) ────────
  const [trendsQuery, setTrendsQuery] = useState("");
  const [trendResults, setTrendResults] = useState<TrendItem[] | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendsError, setTrendsError] = useState("");

  const trendsAbortRef = useRef<AbortController | null>(null);

  // Abort any in-flight trends request on unmount (canonical fetch pattern).
  useEffect(() => {
    return () => {
      trendsAbortRef.current?.abort();
    };
  }, []);

  const runTrendsSearch = useCallback(
    async (searchQuery: string) => {
      const trimmed = searchQuery.trim();
      if (trimmed.length < 2) {
        setTrendsError(t("query_too_short"));
        return;
      }

      // Abort any in-flight request before starting a new one.
      trendsAbortRef.current?.abort();
      const controller = new AbortController();
      trendsAbortRef.current = controller;
      // AI web-search generation is much slower than the YouTube API call. Keep the
      // client budget just above the server's own 60s LLM abort (discover-trends.ts)
      // so the server bounds generation and returns a clean response; this client
      // timeout is only a last-resort safety net. Record when WE aborted so a real
      // timeout surfaces an error instead of silently reverting to the idle state.
      let timedOut = false;
      const timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 65_000);

      setTrendsLoading(true);
      setTrendsError("");

      try {
        const res = await fetch("/api/ai/discover/trends", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed }),
          signal: controller.signal,
        });

        if (!res.ok) {
          setTrendResults(null);
          setTrendsError(res.status === 429 ? t("error_rate_limited") : t("trends_error"));
          return;
        }

        const data = (await res.json()) as { trends: TrendItem[] };
        setTrendResults(Array.isArray(data.trends) ? data.trends : []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Only our own timeout should show an error; an abort from unmount or a
          // superseding search stays silent.
          if (timedOut) {
            setTrendResults(null);
            setTrendsError(t("trends_error"));
          }
          return;
        }
        setTrendResults(null);
        setTrendsError(t("trends_error"));
      } finally {
        clearTimeout(timeoutId);
        setTrendsLoading(false);
        if (trendsAbortRef.current === controller) {
          trendsAbortRef.current = null;
        }
      }
    },
    [t]
  );

  const handleTrendsSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void runTrendsSearch(trendsQuery);
    },
    [runTrendsSearch, trendsQuery]
  );

  return (
    <Tabs defaultValue="youtube" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="youtube" className="gap-1.5">
          <Youtube className="h-4 w-4" aria-hidden="true" />
          {t("tab_youtube")}
        </TabsTrigger>
        <TabsTrigger value="x_trends" className="gap-1.5">
          <TrendingUp className="h-4 w-4" aria-hidden="true" />
          {t("tab_x_trends")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="youtube" className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="discover-query" className="text-sm">
                {t("search_label")}
              </Label>
              <div className="relative">
                <Search
                  className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  aria-hidden="true"
                />
                <Input
                  id="discover-query"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("search_placeholder")}
                  className="ps-9"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="discover-order" className="text-sm">
                {t("sort_label")}
              </Label>
              <div>
                <Select value={order} onValueChange={handleOrderChange}>
                  <SelectTrigger id="discover-order" className="w-full sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {t(`sort_${opt}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="gap-2 sm:min-w-[140px]" size="lg">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {t("searching")}
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" aria-hidden="true" />
                  {t("search_button")}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Loading */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-video w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <Card className="border-destructive/30 bg-destructive/5" role="alert">
            <CardContent className="flex flex-col items-center gap-3 px-4 py-8 text-center">
              <AlertCircle className="text-destructive h-8 w-8" aria-hidden="true" />
              <p className="text-foreground text-sm font-medium">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Empty result set */}
        {!isLoading && !error && results !== null && results.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 px-4 py-10 text-center">
              <Search className="text-muted-foreground h-8 w-8" aria-hidden="true" />
              <p className="text-foreground text-sm font-medium">{t("empty_title")}</p>
              <p className="text-muted-foreground text-xs">{t("empty_description")}</p>
            </CardContent>
          </Card>
        )}

        {/* Initial idle state — no search yet */}
        {!isLoading && !error && results === null && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 px-4 py-10 text-center">
              <Sparkles className="text-primary h-8 w-8" aria-hidden="true" />
              <p className="text-foreground text-sm font-medium">{t("idle_title")}</p>
              <p className="text-muted-foreground max-w-md text-xs">{t("idle_description")}</p>
            </CardContent>
          </Card>
        )}

        {/* Results grid */}
        {!isLoading && !error && results !== null && results.length > 0 && (
          <div className="space-y-3">
            <p role="status" className="text-muted-foreground text-sm">
              {t("results_count", { count: results.length })}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((result) => (
                <YoutubeResultCard
                  key={result.videoId}
                  result={result}
                  maxYoutubeDurationSeconds={maxYoutubeDurationSeconds}
                />
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="x_trends" className="space-y-6">
        <form onSubmit={handleTrendsSubmit} className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="trends-query" className="text-sm">
                {t("trends_search_label")}
              </Label>
              <div className="relative">
                <Search
                  className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  aria-hidden="true"
                />
                <Input
                  id="trends-query"
                  type="search"
                  value={trendsQuery}
                  onChange={(e) => setTrendsQuery(e.target.value)}
                  placeholder={t("trends_search_placeholder")}
                  className="ps-9"
                  autoComplete="off"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={trendsLoading}
              className="gap-2 sm:min-w-[140px]"
              size="lg"
            >
              {trendsLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {t("trends_searching")}
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" aria-hidden="true" />
                  {t("search_button")}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Loading */}
        {trendsLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-16 w-full rounded-md" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!trendsLoading && trendsError && (
          <Card className="border-destructive/30 bg-destructive/5" role="alert">
            <CardContent className="flex flex-col items-center gap-3 px-4 py-8 text-center">
              <AlertCircle className="text-destructive h-8 w-8" aria-hidden="true" />
              <p className="text-foreground text-sm font-medium">{trendsError}</p>
            </CardContent>
          </Card>
        )}

        {/* Empty result set */}
        {!trendsLoading && !trendsError && trendResults !== null && trendResults.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 px-4 py-10 text-center">
              <Search className="text-muted-foreground h-8 w-8" aria-hidden="true" />
              <p className="text-foreground text-sm font-medium">{t("trends_empty_title")}</p>
              <p className="text-muted-foreground text-xs">{t("trends_empty_description")}</p>
            </CardContent>
          </Card>
        )}

        {/* Initial idle state — no search yet */}
        {!trendsLoading && !trendsError && trendResults === null && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 px-4 py-10 text-center">
              <TrendingUp className="text-primary h-8 w-8" aria-hidden="true" />
              <p className="text-foreground text-sm font-medium">{t("trends_idle_title")}</p>
              <p className="text-muted-foreground max-w-md text-xs">
                {t("trends_idle_description")}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results grid */}
        {!trendsLoading && !trendsError && trendResults !== null && trendResults.length > 0 && (
          <div className="space-y-3">
            <p role="status" className="text-muted-foreground text-sm">
              {t("results_count", { count: trendResults.length })}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trendResults.map((trend, i) => (
                <TrendResultCard key={`${trend.title}-${i}`} trend={trend} />
              ))}
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
