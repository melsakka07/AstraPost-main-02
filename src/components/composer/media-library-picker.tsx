"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Play, AlertTriangle, ImageIcon, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { clientLogger } from "@/lib/client-logger";

export interface MediaLibraryItem {
  id: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

interface MediaLibraryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (media: MediaLibraryItem) => void;
  /** Currently attached media count (to enforce 4-per-tweet cap) */
  attachedCount: number;
  /** Current file type filter */
  fileType?: "image" | "video" | "gif";
}

type FileTypeFilter = "all" | "image" | "video" | "gif";

const FILTER_OPTIONS: FileTypeFilter[] = ["all", "image", "video", "gif"];

const PAGE_SIZE = 20;

export function MediaLibraryPicker({
  open,
  onOpenChange,
  onSelect,
  attachedCount,
  fileType: initialFileType,
}: MediaLibraryPickerProps) {
  const t = useTranslations("compose");

  const [items, setItems] = useState<MediaLibraryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FileTypeFilter>(
    initialFileType ? (initialFileType as FileTypeFilter) : "all"
  );

  const capReached = attachedCount >= 4;

  const fetchMedia = useCallback(
    async (cursor?: string, append = false) => {
      const isInitial = !append && !cursor;
      if (isInitial) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        if (cursor) params.set("cursor", cursor);
        if (filter !== "all") params.set("fileType", filter);

        const res = await fetchWithAuth(`/api/media/library?${params.toString()}`);

        if (!res.ok) {
          throw new Error(`Server responded with ${res.status}`);
        }

        const data = (await res.json()) as {
          items: MediaLibraryItem[];
          nextCursor: string | null;
        };

        if (append) {
          setItems((prev) => [...prev, ...data.items]);
        } else {
          setItems(data.items);
        }
        setNextCursor(data.nextCursor);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load media library";
        clientLogger.error("Media library fetch failed", {
          error: message,
        });
        setError(message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter]
  );

  // Fetch on open and when filter changes
  useEffect(() => {
    if (open) {
      setItems([]);
      setNextCursor(null);
      setError(null);
      void fetchMedia();
    }
  }, [open, fetchMedia]);

  const handleFilterChange = (value: FileTypeFilter) => {
    setFilter(value);
  };

  const handleLoadMore = () => {
    if (nextCursor && !loadingMore) {
      void fetchMedia(nextCursor, true);
    }
  };

  const handleRetry = () => {
    setItems([]);
    setNextCursor(null);
    void fetchMedia();
  };

  const handleSelect = (item: MediaLibraryItem) => {
    if (capReached) return;
    onSelect(item);
    onOpenChange(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("media_library.title")}</DialogTitle>
          <DialogDescription>{t("media_library.description")}</DialogDescription>
        </DialogHeader>

        {/* Cap warning */}
        {capReached && (
          <div
            role="alert"
            className="border-warning-6 bg-warning-2 text-warning-11 flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
          >
            <AlertTriangle className="size-4 shrink-0" />
            <span>{t("media_library.cap_warning")}</span>
          </div>
        )}

        {/* File type filter toggle */}
        <div className="bg-muted flex items-center gap-1 rounded-md p-1">
          {FILTER_OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => handleFilterChange(value)}
              className={cn(
                "flex-1 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
                "min-h-[44px]",
                filter === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={filter === value}
            >
              {t(`media_library.filter_${value}`)}
            </button>
          ))}
        </div>

        {/* Content area — scrollable */}
        <div className="max-h-[50vh] overflow-y-auto">
          {/* Loading state */}
          {loading && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <EmptyState
              icon={<AlertTriangle className="size-5" />}
              title={t("media_library.error")}
              description={error}
              primaryAction={
                <Button variant="outline" size="sm" onClick={handleRetry} className="min-h-[44px]">
                  <RefreshCw className="me-2 size-4" />
                  {t("media_library.retry")}
                </Button>
              }
            />
          )}

          {/* Empty state */}
          {!loading && !error && items.length === 0 && (
            <EmptyState
              icon={<ImageIcon className="size-5" />}
              title={t("media_library.no_media")}
              description={t("media_library.no_media_description")}
            />
          )}

          {/* Grid display */}
          {!loading && !error && items.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  disabled={capReached}
                  className={cn(
                    "group relative aspect-square overflow-hidden rounded-lg border",
                    "border-border bg-muted transition-all duration-200",
                    "hover:border-primary hover:scale-[1.02] hover:shadow-md",
                    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                    capReached &&
                      "hover:border-border cursor-not-allowed opacity-50 hover:scale-100"
                  )}
                  aria-label={`${item.fileType} media`}
                >
                  {/* Hover overlay */}
                  <div className="pointer-events-none absolute inset-0 z-10 bg-black/0 transition-colors group-hover:bg-black/20" />

                  {/* Image thumbnail */}
                  {item.fileType !== "video" ? (
                    <Image
                      src={item.fileUrl}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                      className="object-cover"
                    />
                  ) : (
                    /* Video thumbnail with play button overlay */
                    <div className="relative h-full w-full">
                      <Image
                        src={item.fileUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                        className="object-cover"
                      />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="flex size-10 items-center justify-center rounded-full bg-black/60">
                          <Play className="size-5 text-white" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* File type badge */}
                  <span className="pointer-events-none absolute start-1 bottom-1 z-20 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white uppercase">
                    {item.fileType}
                  </span>

                  {/* File size badge */}
                  <span className="pointer-events-none absolute end-1 bottom-1 z-20 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {formatFileSize(item.fileSize)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Load more button */}
        {!loading && !error && nextCursor && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="min-h-[44px]"
            >
              {loadingMore ? <Skeleton className="h-4 w-20" /> : t("media_library.load_more")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
