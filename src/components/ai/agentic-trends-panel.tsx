"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TrendingUp, RefreshCw, Sparkles, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import type { TrendCategory, TrendItem } from "@/lib/schemas/common";
import { cn } from "@/lib/utils";

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

const CATEGORIES: { id: TrendCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "technology", label: "Technology" },
  { id: "business", label: "Business" },
  { id: "news", label: "News" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "sports", label: "Sports" },
  { id: "entertainment", label: "Entertainment" },
];

interface AgenticTrendsPanelProps {
  onSelectTrend: (topic: string) => void;
}

export function AgenticTrendsPanel({ onSelectTrend }: AgenticTrendsPanelProps) {
  const t = useTranslations("ai_agentic");
  const [selectedCategory, setSelectedCategory] = useState<TrendCategory>("all");
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const hasFetched = useRef(false);
  const { openWithContext } = useUpgradeModal();

  const fetchTrends = useCallback(
    async (category: TrendCategory) => {
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      setLoading(true);
      setError(false);

      try {
        const res = await fetch(`/api/ai/trends?category=${category}`, {
          signal: abort.signal,
        });

        if (res.status === 402) {
          let payload: PlanLimitPayload | null = null;
          try {
            payload = (await res.json()) as PlanLimitPayload;
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
          setError(false);
          return;
        }

        if (!res.ok) {
          setError(true);
          return;
        }

        const data = (await res.json()) as {
          trends: TrendItem[];
          cachedAt?: string;
        };
        setTrends(data.trends ?? []);
        setCachedAt(data.cachedAt ?? null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [openWithContext]
  );

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    void fetchTrends("all");
    return () => abortRef.current?.abort();
  }, [fetchTrends]);

  const handleCategoryChange = (cat: TrendCategory) => {
    setSelectedCategory(cat);
    void fetchTrends(cat);
  };

  if (!loading && !error && trends.length === 0 && cachedAt !== null) return null;

  const timeAgo = cachedAt
    ? (() => {
        const mins = Math.round((Date.now() - new Date(cachedAt).getTime()) / 60_000);
        if (mins < 1) return t("trends.just_now");
        if (mins === 1) return t("trends.min_ago", { count: 1 });
        return t("trends.mins_ago", { count: mins });
      })()
    : null;

  return (
    <div className="mt-6">
      {/* Section header */}
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="text-primary h-4 w-4 shrink-0" />
        <span className="text-foreground text-sm font-medium">{t("trends.trending_on_x")}</span>
        {timeAgo && (
          <span className="text-muted-foreground text-xs">
            · {t("trends.updated", { time: timeAgo })}
          </span>
        )}
        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setMobileExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground ms-auto flex items-center gap-1 text-xs transition-colors sm:hidden"
          aria-expanded={mobileExpanded}
          aria-label={mobileExpanded ? t("trends.collapse") : t("trends.show_trending")}
        >
          {mobileExpanded ? t("trends.hide") : t("trends.show")}
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
          className="scrollbar-hide flex items-center gap-1.5 overflow-x-auto pb-2"
          role="tablist"
          aria-label={t("trends.trending_topics")}
        >
          {(() => {
            const allKey = "trends.categories.all";
            const techKey = "trends.categories.technology";
            const businessKey = "trends.categories.business";
            const newsKey = "trends.categories.news";
            const lifestyleKey = "trends.categories.lifestyle";
            const sportsKey = "trends.categories.sports";
            const entertainmentKey = "trends.categories.entertainment";
            const labelMap: Record<string, string> = {
              all: t(allKey),
              technology: t(techKey),
              business: t(businessKey),
              news: t(newsKey),
              lifestyle: t(lifestyleKey),
              sports: t(sportsKey),
              entertainment: t(entertainmentKey),
            };

            return CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={selectedCategory === cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-2.5 text-xs font-medium transition-colors",
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {labelMap[cat.id]}
              </button>
            ));
          })()}
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="mt-3 space-y-2" aria-label={t("trends.loading")} aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="text-muted-foreground mt-3 flex items-center gap-2 py-3 text-xs">
            <span>{t("trends.couldnt_load")}</span>
            <button
              type="button"
              onClick={() => void fetchTrends(selectedCategory)}
              className="text-primary inline-flex items-center gap-1 hover:underline"
            >
              <RefreshCw className="h-3 w-3" />
              {t("trends.retry")}
            </button>
          </div>
        )}

        {/* Trend cards */}
        {!loading && !error && trends.length > 0 && (
          <div className="mt-3 space-y-2" role="list" aria-label={t("trends.trending_topics")}>
            {trends.map((trend, i) => (
              <div
                key={i}
                role="listitem"
                className="group border-border hover:bg-muted/30 flex cursor-pointer items-start justify-between gap-3 rounded-lg border p-3.5 transition-colors"
                onClick={() => onSelectTrend(`${trend.title} ${trend.description}`)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground truncate text-sm font-medium">
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
                      {trend.postCount === "High"
                        ? t("trends.post_count_high")
                        : t("trends.post_count_normal")}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
                    {trend.description}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 min-h-[44px] shrink-0 gap-1.5 px-3 text-xs transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTrend(trend.suggestedAngle);
                  }}
                  aria-label={t("trends.post_about", {
                    topic: trend.suggestedAngle,
                  })}
                >
                  <Sparkles className="h-3 w-3" />
                  {t("trends.post")}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
