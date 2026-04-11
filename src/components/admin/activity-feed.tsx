"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Ban, Clock, FileText, RefreshCw, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
  unban: AlertCircle,
  suspend: AlertTriangle,
  delete: Trash2,
  update: FileText,
  create: FileText,
};

const ACTION_COLORS: Record<string, string> = {
  ban: "text-red-600 dark:text-red-400",
  unban: "text-green-600 dark:text-green-400",
  suspend: "text-orange-600 dark:text-orange-400",
  delete: "text-red-600 dark:text-red-400",
  update: "text-blue-600 dark:text-blue-400",
  create: "text-green-600 dark:text-green-400",
};

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    ban: "Banned user",
    unban: "Unbanned user",
    suspend: "Suspended user",
    delete: "Deleted",
    update: "Updated",
    create: "Created",
  };
  return labels[action] || action;
}

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
  const [activities, setActivities] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

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
  }, [mounted, fetchActivities]);

  if (!mounted) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Recent Admin Activity</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => void fetchActivities()} disabled={loading}>
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
              const actionLabel = getActionLabel(activity.action);

              return (
                <div key={activity.id} className="flex gap-3 border-b pb-4 last:border-0 last:pb-0">
                  <div className={cn("mt-1 flex-shrink-0", iconColor)}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          <span className="text-foreground">
                            {activity.adminName || activity.adminEmail || "Unknown Admin"}
                          </span>{" "}
                          {actionLabel}
                        </p>
                        {activity.targetId && activity.targetType && (
                          <p className="text-muted-foreground text-xs">
                            {activity.targetType}: {activity.targetId}
                          </p>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDistanceToNow(new Date(activity.createdAt), {
                          addSuffix: true,
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
