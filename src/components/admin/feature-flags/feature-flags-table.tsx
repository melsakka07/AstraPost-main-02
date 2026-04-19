"use client";

import { useCallback, useEffect, useState } from "react";
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
      toast.error("Failed to load feature flags");
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
      toast.success(`"${flag.key}" ${newEnabled ? "enabled" : "disabled"}`);
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
          No feature flags found.
        </CardContent>
      </Card>
    );
  }

  // Separate system flags (prefixed with _) from regular feature flags
  const regularFlags = flags.filter((f) => !f.key.startsWith("_"));
  const systemFlags = flags.filter((f) => f.key.startsWith("_"));

  return (
    <div className="space-y-6">
      <Card className="border-blue-200/50 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20">
        <CardContent className="pt-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Rollout %:</strong> Controls the percentage of users (0-100%) that will see this
            feature. Use 0% for disabled, 100% for full rollout, or intermediate values for gradual
            rollouts.
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
                Flag key
              </TableHead>
              <TableHead
                title="Human-readable description of what this feature does"
                className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
              >
                Description
              </TableHead>
              <TableHead
                title="Whether the flag is enabled for rollout"
                className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
              >
                Status
              </TableHead>
              <TableHead
                title="Percentage of users (0-100%) that will see this feature"
                className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
              >
                Rollout %
              </TableHead>
              <TableHead
                title="Toggle flag on or off"
                className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase"
              >
                Toggle
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
                    label={flag.enabled ? "Enabled" : "Disabled"}
                    title={
                      flag.enabled
                        ? "Feature flag is enabled for rollout"
                        : "Feature flag is disabled"
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
                <TableCell className="text-right">
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
          {systemFlags.length} internal system flag{systemFlags.length !== 1 ? "s" : ""} hidden
          (prefixed with _).
        </p>
      )}
    </div>
  );
}
