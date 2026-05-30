"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { StatusIndicator } from "@/components/admin/status-indicator";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FeatureFlag {
  id: string;
  key: string;
  description: string | null;
  enabled: boolean;
  rolloutPercentage: number;
  updatedAt: string;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

interface FeatureFlagsTableProps {
  initialData?: FeatureFlag[] | null;
}

export function FeatureFlagsTable({ initialData }: FeatureFlagsTableProps = {}) {
  const t = useTranslations();

  const [flags, setFlags] = useState<FeatureFlag[]>(initialData ?? []);
  const [loading, setLoading] = useState(initialData === null);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/feature-flags");
      const json = await res.json();
      setFlags(json.data ?? []);
    } catch {
      toast.error(t("admin.featureFlags.loadError"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialData) {
      fetchFlags();
    }
  }, [fetchFlags, initialData]);

  const toggle = async (flag: FeatureFlag) => {
    setToggling(flag.key);
    const newEnabled = !flag.enabled;
    // Optimistic update
    setFlags((prev) => prev.map((f) => (f.key === flag.key ? { ...f, enabled: newEnabled } : f)));
    try {
      const res = await fetch(`/api/admin/feature-flags/${flag.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newEnabled }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(error);
      }
      toast.success(
        t("admin.featureFlags.toggledToast", {
          key: flag.key,
          state: newEnabled ? t("admin.featureFlags.enabled") : t("admin.featureFlags.disabled"),
        })
      );
    } catch (err) {
      // Revert on failure
      setFlags((prev) =>
        prev.map((f) => (f.key === flag.key ? { ...f, enabled: flag.enabled } : f))
      );
      toast.error(err instanceof Error ? err.message : "Failed to update flag");
    } finally {
      setToggling(null);
    }
  };

  const updateRollout = async (flag: FeatureFlag, newPercentage: number) => {
    // Clamp value between 0-100
    const percentage = Math.max(0, Math.min(100, newPercentage));
    setToggling(flag.key);
    // Optimistic update
    setFlags((prev) =>
      prev.map((f) => (f.key === flag.key ? { ...f, rolloutPercentage: percentage } : f))
    );
    try {
      const res = await fetch(`/api/admin/feature-flags/${flag.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rolloutPercentage: percentage }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(error);
      }
      toast.success(`"${flag.key}" rollout set to ${percentage}%`);
    } catch (err) {
      // Revert on failure
      setFlags((prev) =>
        prev.map((f) =>
          f.key === flag.key ? { ...f, rolloutPercentage: flag.rolloutPercentage } : f
        )
      );
      toast.error(err instanceof Error ? err.message : "Failed to update rollout");
    } finally {
      setToggling(null);
    }
  };

  if (loading) return <LoadingSkeleton />;

  if (flags.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex h-32 items-center justify-center text-sm">
          {t("admin.featureFlags.empty")}
        </CardContent>
      </Card>
    );
  }

  // Separate system flags (prefixed with _) from regular feature flags
  const regularFlags = flags.filter((f) => !f.key.startsWith("_"));
  const systemFlags = flags.filter((f) => f.key.startsWith("_"));

  return (
    <div className="space-y-6">
      <Card className="border-info-4/50 bg-info-2/50">
        <CardContent className="pt-4">
          <p className="text-info-12 text-sm">
            <strong>{t("admin.featureFlags.rolloutPercent")}:</strong>{" "}
            {t("admin.featureFlags.rolloutInfo")}
          </p>
        </CardContent>
      </Card>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                title="Unique identifier for the feature flag"
                className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
              >
                {t("admin.featureFlags.table.flagKey")}
              </TableHead>
              <TableHead
                title={t("admin.featureFlags.table.descriptionTitle")}
                className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
              >
                {t("admin.featureFlags.table.description")}
              </TableHead>
              <TableHead
                title={t("admin.featureFlags.table.statusTitle")}
                className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
              >
                {t("admin.featureFlags.table.status")}
              </TableHead>
              <TableHead
                title={t("admin.featureFlags.table.rolloutTitle")}
                className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
              >
                {t("admin.featureFlags.table.rollout")}
              </TableHead>
              <TableHead
                title={t("admin.featureFlags.table.toggleTitle")}
                className="text-muted-foreground text-end text-xs font-medium tracking-wide uppercase"
              >
                {t("admin.featureFlags.table.toggle")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {regularFlags.map((flag) => (
              <TableRow key={flag.key}>
                <TableCell>
                  <span className="font-mono text-sm">{flag.key}</span>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {flag.description ?? "—"}
                </TableCell>
                <TableCell>
                  <StatusIndicator
                    status={flag.enabled ? "active" : "inactive"}
                    label={
                      flag.enabled
                        ? t("admin.featureFlags.enabled")
                        : t("admin.featureFlags.disabled")
                    }
                    title={
                      flag.enabled
                        ? t("admin.featureFlags.enabledTitle")
                        : t("admin.featureFlags.disabledTitle")
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={flag.rolloutPercentage}
                      onChange={(e) => updateRollout(flag, parseInt(e.target.value, 10))}
                      disabled={toggling === flag.key}
                      className="bg-background border-input w-16 rounded border px-2 py-1 text-sm"
                      aria-label={`Rollout percentage for ${flag.key}`}
                    />
                    <span className="text-muted-foreground text-sm">%</span>
                  </div>
                </TableCell>
                <TableCell className="text-end">
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={() => toggle(flag)}
                    disabled={toggling === flag.key}
                    aria-label={`Toggle ${flag.key}`}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {systemFlags.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {t("admin.featureFlags.systemFlagsMessage", { count: systemFlags.length })}
        </p>
      )}
    </div>
  );
}
