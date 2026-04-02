"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const POLL_INTERVAL_MS = 10_000; // 10 seconds

/**
 * Polls /api/queue/sse every 10 s for recently published/failed posts and
 * shows toast notifications + triggers a router refresh.
 *
 * Replaces the previous EventSource (SSE) approach which held a BullMQ
 * QueueEvents Redis connection open for 300 s per tab, exhausting Upstash's
 * concurrent connection limit on the free tier.
 */
export function QueueRealtimeListener() {
  const router = useRouter();
  const [announcement, setAnnouncement] = useState("");
  const sinceRef = useRef(new Date().toISOString());
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function poll() {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      const controller = new AbortController();
      abortRef.current = controller;

      // 8-second timeout — abort rather than holding a connection slot open.
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const res = await fetch(`/api/queue/sse?since=${encodeURIComponent(sinceRef.current)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const { events, serverTime } = await res.json() as {
          events: { id: string; status: string; failReason: string | null }[];
          serverTime: string;
        };

        if (!inFlightRef.current) return; // unmounted

        // Advance the cursor so the next poll only looks at new events
        sinceRef.current = serverTime;

        let shouldRefresh = false;
        for (const e of events) {
          if (e.status === "published") {
            toast.success("Post published successfully");
            setAnnouncement("Post published successfully");
            shouldRefresh = true;
          } else if (e.status === "failed") {
            toast.error(`Post failed: ${e.failReason ?? "unknown error"}`);
            setAnnouncement(`Post failed: ${e.failReason ?? "unknown error"}`);
            shouldRefresh = true;
          }
        }
        if (shouldRefresh) {
          if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
          }
          refreshTimerRef.current = setTimeout(() => {
            if (!inFlightRef.current) return; // unmounted
            router.refresh();
            refreshTimerRef.current = null;
          }, 150);
        }
      } catch (error) {
        // AbortError is expected on timeout or cleanup — not a real network error.
        if ((error as Error)?.name === "AbortError") return;
        // network error — will retry on next interval
      } finally {
        clearTimeout(timeoutId);
        inFlightRef.current = false;
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    }

    const id = setInterval(poll, POLL_INTERVAL_MS);
    // Run immediately on mount so the first feedback isn't delayed 10 s
    void poll();

    return () => {
      clearInterval(id);
      inFlightRef.current = false; // signals unmounted
      // Do NOT abort the fetch on unmount to prevent net::ERR_ABORTED console noise.
      // The server will timeout and close the connection in 7 seconds anyway.
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [router]);

  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {announcement}
    </div>
  );
}
