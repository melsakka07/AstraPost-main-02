"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Inbox, Loader2, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { InboxBulkActions } from "@/components/inbox/inbox-bulk-actions";
import { InboxEmptyState } from "@/components/inbox/inbox-empty-state";
import type { InboxAccount } from "@/components/inbox/inbox-filter-bar";
import { InboxFilterBar, type InboxType } from "@/components/inbox/inbox-filter-bar";
import { InboxItemCard } from "@/components/inbox/inbox-item-card";
import { Button } from "@/components/ui/button";
import { clientLogger } from "@/lib/client-logger";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import type { InboxItem } from "@/lib/schema";

interface InboxPageClientProps {
  accounts: InboxAccount[];
}

/**
 * Primary inbox client component.
 *
 * Manages all inbox state: items list, cursor-based pagination, filter state,
 * selection state, and two polling loops (unread count every 30s, new items
 * every 60s when page is focused). Follows the canonical polling pattern
 * (AbortController + inFlightRef mutex + 8s timeout).
 */
export function InboxPageClient({ accounts }: InboxPageClientProps) {
  const t = useTranslations("inbox");

  // ── Items state ──────────────────────────────────────────────────────
  const [items, setItems] = useState<InboxItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Filters ──────────────────────────────────────────────────────────
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<InboxType>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [showRead, setShowRead] = useState(false);

  // ── Selection ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Polling refs ──────────────────────────────────────────────────────
  const itemsPollAbortRef = useRef<AbortController | null>(null);
  const itemsInFlightRef = useRef(false);
  const focusedRef = useRef(true);
  // Aborts the previous list fetch when filters change or the page unmounts
  const fetchAbortRef = useRef<AbortController | null>(null);

  // ── Track page focus for polling ─────────────────────────────────────
  useEffect(() => {
    const onFocus = () => {
      focusedRef.current = true;
    };
    const onBlur = () => {
      focusedRef.current = false;
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // ── Build query string from current filters ──────────────────────────
  const buildQuery = useCallback(
    (cursor?: string) => {
      const params = new URLSearchParams();
      params.set("isArchived", String(showArchived));
      if (showRead) params.set("isRead", "true");
      else params.set("isRead", "false");
      if (selectedAccountId) params.set("accountId", selectedAccountId);
      if (selectedType !== "all") params.set("type", selectedType);
      params.set("limit", "20");
      if (cursor) params.set("cursor", cursor);
      return params.toString();
    },
    [selectedAccountId, selectedType, showArchived, showRead]
  );

  // ── Fetch items (initial load and filter changes) ────────────────────
  const fetchItems = useCallback(
    async (cursor?: string, append = false) => {
      // Abort any in-flight list fetch — the newest filter state wins
      fetchAbortRef.current?.abort();
      const controller = new AbortController();
      fetchAbortRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsInitialLoading(true);
      }
      setLoadError(null);

      try {
        const query = buildQuery(cursor);
        const res = await fetchWithAuth(`/api/inbox?${query}`, {
          signal: controller.signal,
        });
        if (res.status === 429) {
          setLoadError(t("error.rateLimited"));
          return;
        }
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = (await res.json()) as {
          items: InboxItem[];
          nextCursor: string | null;
          total: number;
        };

        if (append) {
          setItems((prev) => [...prev, ...data.items]);
        } else {
          setItems(data.items);
        }
        setNextCursor(data.nextCursor);
        setTotal(data.total);
      } catch (error) {
        if ((error as Error)?.name === "AbortError") {
          // Still the current fetch → the 8s timeout fired; surface an error.
          // Otherwise a newer fetch superseded this one — stay silent.
          if (fetchAbortRef.current === controller) setLoadError(t("error.loadFailed"));
          return;
        }
        clientLogger.error("inbox_fetch_failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        setLoadError(t("error.loadFailed"));
      } finally {
        clearTimeout(timeoutId);
        if (fetchAbortRef.current === controller) {
          fetchAbortRef.current = null;
          setIsInitialLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [buildQuery, t]
  );

  // ── Re-fetch when filters change (superseded fetches abort themselves) ─
  useEffect(() => {
    setSelectedIds(new Set());
    fetchItems();
    return () => {
      fetchAbortRef.current?.abort();
    };
  }, [fetchItems]);

  // ── Poll for new items every 60s when page is focused ────────────────
  useEffect(() => {
    async function poll() {
      if (itemsInFlightRef.current) return;
      if (!focusedRef.current) return;

      itemsInFlightRef.current = true;
      const controller = new AbortController();
      itemsPollAbortRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const query = buildQuery();
        const res = await fetchWithAuth(`/api/inbox?${query}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          items: InboxItem[];
          nextCursor: string | null;
          total: number;
        };
        if (itemsInFlightRef.current) {
          setItems(data.items);
          setNextCursor(data.nextCursor);
          setTotal(data.total);
        }
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
      } finally {
        clearTimeout(timeoutId);
        itemsInFlightRef.current = false;
        if (itemsPollAbortRef.current === controller) {
          itemsPollAbortRef.current = null;
        }
      }
    }

    const id = setInterval(poll, 60_000);
    return () => {
      clearInterval(id);
      itemsInFlightRef.current = false;
    };
  }, [buildQuery]);

  // ── Load more (cursor-based pagination) ──────────────────────────────
  const handleLoadMore = useCallback(() => {
    if (nextCursor) fetchItems(nextCursor, true);
  }, [nextCursor, fetchItems]);

  // ── Refresh inbox manually (triggers X API refresh) ──────────────────
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setLoadError(null);
    try {
      const res = await fetchWithAuth("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedAccountId ? { accountId: selectedAccountId } : {}),
      });
      if (res.status === 429) {
        setLoadError(t("error.rateLimited"));
        return;
      }
      if (res.status === 400) {
        const body = (await res.json().catch(() => null)) as { code?: string } | null;
        if (body?.code === "X_SESSION_EXPIRED") {
          setLoadError(t("error.reconnectRequired"));
          return;
        }
        throw new Error("Refresh failed: 400");
      }
      if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
      // Re-fetch items after refresh
      await fetchItems();
    } catch (error) {
      clientLogger.error("inbox_refresh_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      setLoadError(t("error.refreshFailed"));
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, selectedAccountId, t, fetchItems]);

  // ── Individual item actions ──────────────────────────────────────────
  const handleReply = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isReplied: true, isRead: true } : item))
    );
  }, []);

  const handleAiReply = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isReplied: true, aiReplied: true, isRead: true } : item
      )
    );
  }, []);

  const handleMarkRead = useCallback((id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
  }, []);

  const handleArchive = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // ── Selection toggle ─────────────────────────────────────────────────
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkComplete = useCallback(() => {
    fetchItems();
  }, [fetchItems]);

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <DashboardPageWrapper
      icon={Inbox}
      title={t("title")}
      description={t("description")}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing || isInitialLoading}
        >
          <RefreshCw className={isRefreshing ? "me-2 h-4 w-4 animate-spin" : "me-2 h-4 w-4"} />
          {t("empty.refresh")}
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Filter bar */}
        <InboxFilterBar
          selectedAccountId={selectedAccountId}
          onAccountChange={setSelectedAccountId}
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          showArchived={showArchived}
          onArchivedToggle={setShowArchived}
          showRead={showRead}
          onReadToggle={setShowRead}
          accounts={accounts}
          totalItemCount={total}
        />

        {/* Bulk actions */}
        <InboxBulkActions
          selectedIds={Array.from(selectedIds)}
          onClearSelection={handleClearSelection}
          onActionComplete={handleBulkComplete}
        />

        {/* Loading state (initial) */}
        {isInitialLoading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            <p className="text-muted-foreground text-sm">{t("loading")}</p>
          </div>
        ) : loadError ? (
          /* Error state */
          <div className="flex flex-col items-center gap-3 py-16">
            <p className="text-destructive text-sm">{loadError}</p>
            <Button variant="outline" size="sm" onClick={() => fetchItems()}>
              {t("error.retry")}
            </Button>
          </div>
        ) : items.length === 0 ? (
          /* Empty state */
          <InboxEmptyState
            isFiltered={
              selectedAccountId !== null || selectedType !== "all" || showArchived || showRead
            }
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        ) : (
          /* Items list */
          <div className="space-y-3">
            {items.map((item) => (
              <InboxItemCard
                key={item.id}
                item={item}
                onReply={handleReply}
                onAiReply={handleAiReply}
                onMarkRead={handleMarkRead}
                onArchive={handleArchive}
                isSelected={selectedIds.has(item.id)}
                onToggleSelect={handleToggleSelect}
              />
            ))}

            {/* Load more */}
            {nextCursor ? (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      {t("loading")}
                    </>
                  ) : (
                    t("loadMore")
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  );
}
