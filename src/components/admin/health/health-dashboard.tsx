"use client";

import { useEffect, useState } from "react";
import {
  Database,
  Key,
  CreditCard,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface HealthData {
  database: { connected: boolean; error: string | null };
  env: { postgres: boolean; auth: boolean; ai: boolean; stripe: boolean; storage: boolean };
  subscriptions: { active: number; trialing: number; cancelled: number };
  oauthTokens: {
    x: { total: number; expired: number };
    linkedin: { total: number; expired: number };
    instagram: { total: number; expired: number };
  };
  jobs: { success24h: number; failed24h: number };
}

type Status = "ok" | "warning" | "error";

interface HealthCardProps {
  title: string;
  status: Status;
  icon: LucideIcon;
  children: React.ReactNode;
}

function HealthCard({ title, status, icon: Icon, children }: HealthCardProps) {
  const statusConfig = {
    ok: { color: "text-green-500", bg: "bg-green-500/10", label: "OK", badge: "default" as const },
    warning: {
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      label: "WARNING",
      badge: "secondary" as const,
    },
    error: {
      color: "text-destructive",
      bg: "bg-destructive/10",
      label: "ERROR",
      badge: "destructive" as const,
    },
  };

  const config = statusConfig[status];

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${config.bg}`}>
            <Icon className={`h-4 w-4 ${config.color}`} />
          </div>
          <Badge variant={config.badge}>{config.label}</Badge>
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium">{title}</p>
          <div className="mt-2">{children}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-5">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function HealthDashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/health")
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(err.error || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((json) => setHealth(json.data ?? null))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to fetch health data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-destructive flex items-center gap-3">
            <XCircle className="h-5 w-5" />
            <p className="font-medium">Failed to load health data</p>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }
  if (!health) return null;

  // Calculate status for each card
  const dbStatus: Status = health.database.connected ? "ok" : "error";

  const envMissing = Object.entries(health.env)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const envStatus: Status = envMissing.length === 0 ? "ok" : "warning";

  const jobStatus: Status =
    health.jobs.failed24h === 0 ? "ok" : health.jobs.failed24h < 5 ? "warning" : "error";

  const getOAuthStatus = (total: number, expired: number): Status => {
    if (total === 0) return "ok";
    if (expired === 0) return "ok";
    if (expired < total * 0.3) return "warning";
    return "error";
  };

  return (
    <div className="space-y-6">
      {/* Database */}
      <HealthCard title="Database" status={dbStatus} icon={Database}>
        {health.database.connected ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>Connected</span>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-destructive flex items-center gap-2 text-sm">
              <XCircle className="h-4 w-4" />
              <span>Connection failed</span>
            </div>
            {health.database.error && (
              <p className="text-muted-foreground text-xs">{health.database.error}</p>
            )}
          </div>
        )}
      </HealthCard>

      {/* Environment Variables */}
      <HealthCard title="Environment Variables" status={envStatus} icon={Key}>
        {envMissing.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>All configured</span>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              <span>Missing variables</span>
            </div>
            <p className="text-muted-foreground text-xs">
              {envMissing.map((e) => e.toUpperCase()).join(", ")}
            </p>
          </div>
        )}
      </HealthCard>

      {/* Subscriptions */}
      <HealthCard title="Subscriptions" status="ok" icon={CreditCard}>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-2xl font-bold tabular-nums">{health.subscriptions.active}</p>
            <p className="text-muted-foreground text-xs">Active</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{health.subscriptions.trialing}</p>
            <p className="text-muted-foreground text-xs">Trialing</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{health.subscriptions.cancelled}</p>
            <p className="text-muted-foreground text-xs">Cancelled</p>
          </div>
        </div>
      </HealthCard>

      {/* OAuth Tokens */}
      <div className="grid gap-4 sm:grid-cols-3">
        <HealthCard
          title="X (Twitter) Tokens"
          status={getOAuthStatus(health.oauthTokens.x.total, health.oauthTokens.x.expired)}
          icon={Shield}
        >
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums">{health.oauthTokens.x.total}</p>
            <p className="text-muted-foreground text-xs">
              {health.oauthTokens.x.expired > 0
                ? `${health.oauthTokens.x.expired} expired`
                : "All valid"}
            </p>
          </div>
        </HealthCard>

        <HealthCard
          title="LinkedIn Tokens"
          status={getOAuthStatus(
            health.oauthTokens.linkedin.total,
            health.oauthTokens.linkedin.expired
          )}
          icon={Shield}
        >
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums">{health.oauthTokens.linkedin.total}</p>
            <p className="text-muted-foreground text-xs">
              {health.oauthTokens.linkedin.expired > 0
                ? `${health.oauthTokens.linkedin.expired} expired`
                : "All valid"}
            </p>
          </div>
        </HealthCard>

        <HealthCard
          title="Instagram Tokens"
          status={getOAuthStatus(
            health.oauthTokens.instagram.total,
            health.oauthTokens.instagram.expired
          )}
          icon={Shield}
        >
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums">{health.oauthTokens.instagram.total}</p>
            <p className="text-muted-foreground text-xs">
              {health.oauthTokens.instagram.expired > 0
                ? `${health.oauthTokens.instagram.expired} expired`
                : "All valid"}
            </p>
          </div>
        </HealthCard>
      </div>

      {/* Queue Health */}
      <HealthCard title="Queue Health (24h)" status={jobStatus} icon={Activity}>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-600 tabular-nums">
              {health.jobs.success24h}
            </p>
            <p className="text-muted-foreground text-xs">Success</p>
          </div>
          <div>
            <p
              className={`text-2xl font-bold tabular-nums ${
                health.jobs.failed24h > 0 ? "text-destructive" : "text-green-600"
              }`}
            >
              {health.jobs.failed24h}
            </p>
            <p className="text-muted-foreground text-xs">Failed</p>
          </div>
        </div>
      </HealthCard>
    </div>
  );
}
