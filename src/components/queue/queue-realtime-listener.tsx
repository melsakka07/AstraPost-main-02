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

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/queue/sse?since=${encodeURIComponent(sinceRef.current)}`);
        if (!res.ok) return;
        const { events, serverTime } = await res.json() as {
          events: { id: string; status: string; failReason: string | null }[];
          serverTime: string;
        };

        // Advance the cursor so the next poll only looks at new events
        sinceRef.current = serverTime;

        for (const e of events) {
          if (e.status === "published") {
            toast.success("Post published successfully");
            setAnnouncement("Post published successfully");
            router.refresh();
          } else if (e.status === "failed") {
            toast.error(`Post failed: ${e.failReason ?? "unknown error"}`);
            setAnnouncement(`Post failed: ${e.failReason ?? "unknown error"}`);
            router.refresh();
          }
        }
      } catch {
        // network error — will retry on next interval
      }
    }

    const id = setInterval(poll, POLL_INTERVAL_MS);
    // Run immediately on mount so the first feedback isn't delayed 10 s
    void poll();

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [router]);

  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {announcement}
    </div>
  );
}
