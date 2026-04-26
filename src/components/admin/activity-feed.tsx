"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Bell,
  Clock,
  FileText,
  Flag,
  Map,
  RefreshCw,
  ShieldAlert,
  Tag,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ACTION_LABELS, type AuditAction } from "./audit/action-labels";

const POLL_INTERVAL_MS = 30_000; // 30 seconds

interface AuditLog {
  id: string;
  action: string;
  adminId: string;
  adminName?: string | null;
  adminEmail?: string | null;
  targetType: string | null;
  targetId: string | null;
  details?: unknown;
  createdAt: string;
}

interface ActivityFeedProps {
  limit?: number;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  ban: Ban,
  unban: UserCheck,
  delete_user: Trash2,
  suspend: AlertTriangle,
  unsuspend: UserCheck,
  impersonate_start: ShieldAlert,
  impersonate_end: ShieldAlert,
  plan_change: Tag,
  feature_flag_toggle: Flag,
  promo_create: Tag,
  promo_update: Tag,
  promo_delete: Trash2,
  announcement_update: Bell,
  subscriber_create: Users,
  subscriber_update: FileText,
  roadmap_update: Map,
  bulk_operation: Users,
};

const ACTION_COLORS: Record<string, string> = {
  ban: "text-red-600 dark:text-red-400",
  unban: "text-green-600 dark:text-green-400",
  delete_user: "text-red-700 dark:text-red-300",
  suspend: "text-orange-600 dark:text-orange-400",
  unsuspend: "text-green-600 dark:text-green-400",
  impersonate_start: "text-purple-700 dark:text-purple-300",
  impersonate_end: "text-purple-600 dark:text-purple-400",
  plan_change: "text-blue-600 dark:text-blue-400",
  feature_flag_toggle: "text-indigo-600 dark:text-indigo-400",
  promo_create: "text-cyan-600 dark:text-cyan-400",
  promo_update: "text-cyan-600 dark:text-cyan-400",
  promo_delete: "text-red-600 dark:text-red-400",
  announcement_update: "text-indigo-600 dark:text-indigo-400",
  subscriber_create: "text-teal-600 dark:text-teal-400",
  subscriber_update: "text-teal-600 dark:text-teal-400",
  roadmap_update: "text-indigo-600 dark:text-indigo-400",
  bulk_operation: "text-amber-600 dark:text-amber-400",
};

function ActivityFeedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminActivityFeed({ limit = 10 }: ActivityFeedProps) {
  const locale = useLocale();
  const [activities, setActivities] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pathname = usePathname();

  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const pollIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchActivities = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;

    // 8-second timeout
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(`/api/admin/audit?limit=${limit}&sort=desc`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch activities: ${res.status}`);
      }

      if (!inFlightRef.current) return;

      const { data } = (await res.json()) as { data: AuditLog[] };
      setActivities(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      // AbortError is expected on timeout
      if ((err as Error)?.name === "AbortError") return;

      if (inFlightRef.current) {
        setError((err as Error)?.message || "Failed to load activities");
      }
    } finally {
      clearTimeout(timeoutId);
      inFlightRef.current = false;
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    void fetchActivities();

    pollIdRef.current = setInterval(fetchActivities, POLL_INTERVAL_MS);

    return () => {
      if (pollIdRef.current) {
        clearInterval(pollIdRef.current);
      }
      inFlightRef.current = false;
    };
  }, [mounted, fetchActivities, pathname]);

  if (!mounted) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 space-y-0 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Recent Admin Activity</CardTitle>
            <Link href="/admin/audit" className="text-primary text-xs hover:underline">
              View all →
            </Link>
          </div>
          {lastUpdated && (
            <p className="text-muted-foreground mt-1 text-xs">
              Last updated:{" "}
              {formatDistanceToNow(lastUpdated, {
                addSuffix: true,
                locale: locale === "ar" ? ar : enUS,
              })}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void fetchActivities()}
          disabled={loading}
          aria-label="Refresh activity feed"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading && activities.length === 0 ? (
          <ActivityFeedSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertCircle className="text-destructive h-8 w-8" />
            <div>
              <p className="text-sm font-medium">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => void fetchActivities()}
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            No admin activity yet
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const IconComponent = ACTION_ICONS[activity.action] || Clock;
              const iconColor = ACTION_COLORS[activity.action] || "text-muted-foreground";
              const actionLabel = ACTION_LABELS[activity.action as AuditAction] ?? activity.action;
              const hasReason =
                activity.details &&
                typeof activity.details === "object" &&
                "reason" in (activity.details as Record<string, unknown>);
              const reasonText = hasReason
                ? String((activity.details as Record<string, unknown>).reason)
                : "";

              return (
                <div key={activity.id} className="flex gap-3 border-b pb-4 last:border-0 last:pb-0">
                  <div className={cn("mt-1 flex-shrink-0", iconColor)}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          <span className="font-medium">{activity.adminName ?? "Admin"}</span>{" "}
                          {actionLabel}
                          {hasReason ? (
                            <span className="text-muted-foreground"> — {reasonText}</span>
                          ) : null}
                        </p>
                        {activity.targetId && activity.targetType && (
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            Affected: <span className="capitalize">{activity.targetType}</span>{" "}
                            <code className="font-mono text-xs">
                              {activity.targetId.slice(0, 8)}…
                            </code>
                          </p>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDistanceToNow(new Date(activity.createdAt), {
                          addSuffix: true,
                          locale: locale === "ar" ? ar : enUS,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
