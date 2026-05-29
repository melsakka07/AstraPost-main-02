"use client";

import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { ExternalLink, History, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { HistoryItem } from "./inspiration-types";

interface InspirationHistoryListProps {
  history: HistoryItem[];
  /** Re-import a history item by its source URL (switches to the import tab). */
  onReimport: (url: string) => void;
}

export function InspirationHistoryList({ history, onReimport }: InspirationHistoryListProps) {
  const t = useTranslations("inspiration");
  const locale = useLocale();

  return (
    <Card>
      <CardContent className="p-6">
        {history.length === 0 ? (
          <EmptyState
            icon={<History className="h-5 w-5 opacity-50" />}
            title={t("no_history")}
            className="border-0 bg-transparent py-16"
          />
        ) : (
          <ul role="list" className="space-y-3">
            {history.map((item) => (
              <li
                key={item.id}
                className="hover:bg-muted/50 rounded-lg border p-4 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-medium">@{item.sourceAuthorHandle}</span>
                      {item.action && (
                        <Badge variant="outline" className="text-xs">
                          {item.action}
                        </Badge>
                      )}
                      <span className="text-muted-foreground text-xs">
                        {formatDistanceToNow(new Date(item.createdAt), {
                          addSuffix: true,
                          locale: locale === "ar" ? ar : enUS,
                        })}
                      </span>
                    </div>
                    <p className="text-muted-foreground line-clamp-2 text-sm">{item.sourceText}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-11 min-h-11 text-xs"
                      onClick={() =>
                        onReimport(
                          `https://x.com/${item.sourceAuthorHandle}/status/${item.sourceTweetId}`
                        )
                      }
                    >
                      <RefreshCw className="me-1 h-3 w-3" />
                      {t("re_import")}
                    </Button>
                    <a
                      href={`https://x.com/${item.sourceAuthorHandle}/status/${item.sourceTweetId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      dir="ltr"
                      className="text-muted-foreground hover:text-foreground hover:bg-accent inline-flex h-11 min-h-11 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {t("view_on_x")}
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
