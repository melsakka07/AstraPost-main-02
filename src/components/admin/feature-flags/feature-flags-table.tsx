"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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

export function FeatureFlagsTable() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const toggle = async (flag: FeatureFlag) => {
    setToggling(flag.key);
    const newEnabled = !flag.enabled;
    // Optimistic update
    setFlags((prev) =>
      prev.map((f) => (f.key === flag.key ? { ...f, enabled: newEnabled } : f))
    );
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

  if (loading) return <LoadingSkeleton />;

  if (flags.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-32 items-center justify-center text-sm text-muted-foreground">
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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Flag key</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Toggle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {regularFlags.map((flag) => (
              <TableRow key={flag.key}>
                <TableCell>
                  <span className="font-mono text-sm">{flag.key}</span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {flag.description ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={flag.enabled ? "default" : "secondary"}>
                    {flag.enabled ? "Enabled" : "Disabled"}
                  </Badge>
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
        <p className="text-xs text-muted-foreground">
          {systemFlags.length} internal system flag{systemFlags.length !== 1 ? "s" : ""} hidden (prefixed with _).
        </p>
      )}
    </div>
  );
}
