"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { clientLogger } from "@/lib/client-logger";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { cn } from "@/lib/utils";

interface InboxUnreadBadgeProps {
  /** Optional CSS class for positioning overrides */
  className?: string;
}

/**
 * Self-contained polling badge for the inbox unread count.
 *
 * Polls GET /api/inbox/unread-count every 30s. Used in the sidebar nav
 * item and the mobile bottom nav. Follows the canonical polling pattern
 * (AbortController + inFlightRef mutex + cleanup).
 */
export function InboxUnreadBadge({ className }: InboxUnreadBadgeProps) {
  const t = useTranslations("inbox");
  const [count, setCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    async function fetchCount() {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      const controller = new AbortController();
      abortRef.current = controller;

      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const res = await fetchWithAuth("/api/inbox/unread-count", {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { count: number };
        if (inFlightRef.current) {
          setCount(data.count ?? 0);
        }
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
        clientLogger.error("inbox_unread_badge_poll_failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        clearTimeout(timeoutId);
        inFlightRef.current = false;
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => {
      clearInterval(interval);
      inFlightRef.current = false;
    };
  }, []);

  if (count === 0) return null;

  const display = count > 99 ? "99+" : String(count);

  return (
    <span
      aria-label={t("unreadCount", { count })}
      className={cn(
        "bg-danger-9 ms-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] leading-none font-bold text-white",
        className
      )}
    >
      {display}
      <span className="sr-only">{t("unreadCount", { count })}</span>
    </span>
  );
}
