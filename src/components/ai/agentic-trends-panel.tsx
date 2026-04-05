"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TrendingUp, RefreshCw, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrendCategory, TrendItem } from "@/lib/schemas/common";
import { cn } from "@/lib/utils";

const CATEGORIES: { id: TrendCategory; label: string }[] = [
  { id: "all",           label: "All" },
  { id: "technology",    label: "Technology" },
  { id: "business",      label: "Business" },
  { id: "news",          label: "News" },
  { id: "lifestyle",     label: "Lifestyle" },
  { id: "sports",        label: "Sports" },
  { id: "entertainment", label: "Entertainment" },
];

interface AgenticTrendsPanelProps {
  onSelectTrend: (topic: string) => void;
}

export function AgenticTrendsPanel({ onSelectTrend }: AgenticTrendsPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<TrendCategory>("all");
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  // On mobile (< sm), collapsed by default; on desktop always expanded.
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchTrends = useCallback(async (category: TrendCategory) => {
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setLoading(true);
    setError(false);

    try {
      const res = await fetch(`/api/ai/trends?category=${category}`, {
        signal: abort.signal,
      });

      if (!res.ok) {
        setError(true);
        return;
      }

      const data = await res.json() as { trends: TrendItem[]; cachedAt?: string };
      setTrends(data.trends ?? []);
      setCachedAt(data.cachedAt ?? null);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTrends("all");
    return () => abortRef.current?.abort();
  }, [fetchTrends]);

  const handleCategoryChange = (cat: TrendCategory) => {
    setSelectedCategory(cat);
    void fetchTrends(cat);
  };

  // Don't render the panel at all if fetch succeeded but returned nothing
  if (!loading && !error && trends.length === 0 && cachedAt !== null) return null;

  const timeAgo = cachedAt
    ? (() => {
        const mins = Math.round((Date.now() - new Date(cachedAt).getTime()) / 60_000);
        if (mins < 1) return "just now";
        if (mins === 1) return "1 min ago";
        return `${mins} mins ago`;
      })()
    : null;

  return (
    <div className="mt-6">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-medium text-foreground">Trending on X</span>
        {timeAgo && (
          <span className="text-xs text-muted-foreground">· Updated {timeAgo}</span>
        )}
        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setMobileExpanded((v) => !v)}
          className="ml-auto sm:hidden flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-expanded={mobileExpanded}
          aria-label={mobileExpanded ? "Collapse trending topics" : "Show trending topics"}
        >
          {mobileExpanded ? "Hide" : "Show"}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              mobileExpanded && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Content — hidden on mobile when collapsed */}
      <div className={cn("sm:block", !mobileExpanded && "hidden sm:block")}>
        {/* Category tabs */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-hide"
          role="tablist"
          aria-label="Trend categories"
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={selectedCategory === cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-2 mt-3" aria-label="Loading trends" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground py-3">
            <span>Couldn&apos;t load trends right now.</span>
            <button
              type="button"
              onClick={() => void fetchTrends(selectedCategory)}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        )}

        {/* Trend cards */}
        {!loading && !error && trends.length > 0 && (
          <div className="space-y-2 mt-3" role="list" aria-label="Trending topics">
            {trends.map((trend, i) => (
              <div
                key={i}
                role="listitem"
                className="group flex items-start justify-between gap-3 rounded-lg border border-border p-3.5 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => onSelectTrend(trend.title)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {trend.title}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        trend.postCount === "High"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {trend.postCount}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {trend.description}
                  </p>
                </div>
                {/* "Post" button — always visible on touch, hover-only on desktop */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-8 px-3 text-xs gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTrend(trend.suggestedAngle);
                  }}
                  aria-label={`Post about: ${trend.suggestedAngle}`}
                >
                  <Sparkles className="h-3 w-3" />
                  Post
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
