"use client";

import { RefreshCw, Inbox } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

interface InboxEmptyStateProps {
  /** True when filters are active (shows "filtered" copy) */
  isFiltered?: boolean;
  /** Callback to trigger an inbox refresh */
  onRefresh?: () => void;
  /** Whether a refresh is currently in progress */
  isRefreshing?: boolean;
}

/**
 * Empty state for the inbox — shown when no items match the current view.
 * Uses the shared EmptyState primitive with an Inbox icon.
 */
export function InboxEmptyState({
  isFiltered = false,
  onRefresh,
  isRefreshing = false,
}: InboxEmptyStateProps) {
  const t = useTranslations("inbox");

  return (
    <EmptyState
      icon={<Inbox className="h-6 w-6" />}
      title={isFiltered ? t("empty.filtered") : t("empty.default")}
      description={isFiltered ? t("empty.filteredDescription") : t("empty.defaultDescription")}
      primaryAction={
        onRefresh ? (
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
            <RefreshCw className={isRefreshing ? "me-2 h-4 w-4 animate-spin" : "me-2 h-4 w-4"} />
            {t("empty.refresh")}
          </Button>
        ) : undefined
      }
    />
  );
}
