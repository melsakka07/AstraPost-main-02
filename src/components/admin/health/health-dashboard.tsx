"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
import { ErrorState } from "@/components/admin/error-state";
import { StatusIndicator } from "@/components/admin/status-indicator";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface HealthData {
  status: "ok" | "degraded" | "critical";
  checks: {
    postgres: { ok: boolean; latency: number; error?: string };
    redis: { ok: boolean; latency: number; error?: string };
    bullmq: { ok: boolean; latency: number; error?: string };
    stripe: { ok: boolean; latency: number; error?: string };
    openrouter: { ok: boolean; latency: number; error?: string };
  };
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
    ok: { color: "text-green-500", bg: "bg-green-500/10" },
    warning: {
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
    },
    error: {
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
  };

  const statusIndicatorMap: Record<Status, "active" | "error" | "pending"> = {
    ok: "active",
    warning: "pending",
    error: "error",
  };

  const config = statusConfig[status];

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${config.bg}`}>
            <Icon className={`h-4 w-4 ${config.color}`} />
          </div>
          <StatusIndicator
            status={statusIndicatorMap[status]}
            label={status.toUpperCase()}
            showIcon={false}
          />
        </div>
        <div className="mt-4">
          <p className="text-sm font-semibold">{title}</p>
          <div className="mt-3">{children}</div>
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

interface HealthDashboardProps {
  initialData?: HealthData | null;
}

export function HealthDashboard({ initialData }: HealthDashboardProps) {
  const [health, setHealth] = useState<HealthData | null>(initialData ?? null);
  const [loading, setLoading] = useState(initialData === null);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const abortController = new AbortController();

    const fetchHealth = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const r = await fetch("/api/admin/health", {
          signal: controller.signal,
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(err.error || `HTTP ${r.status}`);
        }
        const json = await r.json();
        setHealth(json);
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message || "Failed to fetch health data");
        }
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);

    return () => {
      abortController.abort();
      clearInterval(interval);
    };
  }, [pathname]);

  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <ErrorState
        title="Failed to load system health"
        description="Unable to fetch health check data from the server"
        error={error}
        onRetry={() => window.location.reload()}
      />
    );
  }
  if (!health) return null;

  // Calculate status for each card
  const dbStatus: Status = health.checks.postgres.ok ? "ok" : "error";

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
      {/* Top cards: Database, Env Vars, Subscriptions, Queue Health */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Database */}
        <HealthCard title="Database" status={dbStatus} icon={Database}>
          {health.checks.postgres.ok ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Connected ({health.checks.postgres.latency}ms)</span>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-destructive flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4" />
                <span>Connection failed</span>
              </div>
              {health.checks.postgres.error && (
                <p className="text-muted-foreground text-xs">{health.checks.postgres.error}</p>
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
          <div className="space-y-1.5">
            {[
              { label: "Active", value: health.subscriptions.active },
              { label: "Trialing", value: health.subscriptions.trialing },
              { label: "Cancelled", value: health.subscriptions.cancelled },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="grid items-center gap-2"
                style={{ gridTemplateColumns: "5rem 1fr 2.5rem" }}
              >
                <span className="text-muted-foreground text-xs">{label}</span>
                <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                  <div
                    className="bg-primary/70 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${health.subscriptions.active + health.subscriptions.trialing + health.subscriptions.cancelled > 0 ? Math.round((value / (health.subscriptions.active + health.subscriptions.trialing + health.subscriptions.cancelled)) * 100) : 0}%`,
                    }}
                  />
                </div>
                <span className="text-right text-sm font-semibold tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </HealthCard>

        {/* Queue Health */}
        <HealthCard title="Queue Health (24h)" status={jobStatus} icon={Activity}>
          <div className="space-y-1.5">
            <div
              className="grid items-center gap-2"
              style={{ gridTemplateColumns: "4.5rem 1fr 2.5rem" }}
            >
              <span className="text-muted-foreground text-xs">Success</span>
              <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-green-500/70 transition-all duration-500"
                  style={{
                    width: `${health.jobs.success24h + health.jobs.failed24h > 0 ? Math.round((health.jobs.success24h / (health.jobs.success24h + health.jobs.failed24h)) * 100) : 100}%`,
                  }}
                />
              </div>
              <span className="text-right text-sm font-semibold text-green-600 tabular-nums">
                {health.jobs.success24h}
              </span>
            </div>
            <div
              className="grid items-center gap-2"
              style={{ gridTemplateColumns: "4.5rem 1fr 2.5rem" }}
            >
              <span className="text-muted-foreground text-xs">Failed</span>
              <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                <div
                  className="bg-destructive/70 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${health.jobs.success24h + health.jobs.failed24h > 0 ? Math.round((health.jobs.failed24h / (health.jobs.success24h + health.jobs.failed24h)) * 100) : 0}%`,
                  }}
                />
              </div>
              <span
                className={`text-right text-sm font-semibold tabular-nums ${health.jobs.failed24h > 0 ? "text-destructive" : "text-muted-foreground"}`}
              >
                {health.jobs.failed24h}
              </span>
            </div>
          </div>
        </HealthCard>
      </div>

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
    </div>
  );
}
