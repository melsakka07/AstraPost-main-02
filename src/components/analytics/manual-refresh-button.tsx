"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ManualRefreshButton({
  xAccountId,
  lastRefreshedAt,
}: {
  xAccountId: string;
  lastRefreshedAt?: Date | null;
}) {
  const t = useTranslations("analytics");
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
    if (minutes < 1) return t("refresh_button.just_now");
    if (minutes < 60) return t("refresh_button.min_ago", { minutes });
    return t("refresh_button.over_hour_ago");
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
              throw new Error(body?.error || t("refresh_button.failed"));
            }
            toast.success(t("toasts.refresh_queued"));
            router.refresh();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : t("refresh_button.failed"));
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? t("refresh_button.refreshing") : t("refresh_button.refresh_now")}
      </Button>
      {lastRefreshedAt && (
        <span className="text-muted-foreground text-xs">
          {t("refresh_button.last_synced", { time: getRelativeTime(lastRefreshedAt) })}
        </span>
      )}
    </div>
  );
}
