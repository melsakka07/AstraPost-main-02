"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ManualRefreshButton({
  xAccountId,
  lastRefreshedAt,
}: {
  xAccountId: string;
  lastRefreshedAt?: Date | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [_tick, setTick] = useState(0);

  useEffect(() => {
    if (!lastRefreshedAt) return;

    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 60000); // Update every 60s

    return () => clearInterval(interval);
  }, [lastRefreshedAt]);

  const getRelativeTime = (date: Date | null | undefined): string => {
    if (!date) return "";
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;
    return "over 1 hour ago";
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            const res = await fetch("/api/analytics/refresh", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ xAccountIds: [xAccountId] }),
            });
            if (!res.ok) {
              const body = await res.json().catch(() => null);
              throw new Error(body?.error || "Refresh failed");
            }
            toast.success("Refresh queued");
            router.refresh();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Refresh failed");
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Refreshing..." : "Refresh now"}
      </Button>
      {lastRefreshedAt && (
        <span className="text-muted-foreground text-xs">
          Last synced: {getRelativeTime(lastRefreshedAt)}
        </span>
      )}
    </div>
  );
}
