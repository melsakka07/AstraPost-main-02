"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, Twitter, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { XSubscriptionBadge, type XSubscriptionTier } from "@/components/ui/x-subscription-badge";
import { signIn } from "@/lib/auth-client";

type XAccountItem = {
  id: string;
  xUsername: string;
  xDisplayName?: string | null;
  xAvatarUrl?: string | null;
  isActive?: boolean | null;
  isDefault?: boolean | null;
  tokenExpiresAt?: Date | string | null;
  xSubscriptionTier?: string | null;
  xSubscriptionTierUpdatedAt?: Date | string | null;
};

interface PlanLimitPayload {
  error?: string;
  code?: string;
  message?: string;
  feature?: string;
  plan?: string;
  limit?: number | null;
  used?: number;
  remaining?: number | null;
  upgrade_url?: string;
  suggested_plan?: string;
  trial_active?: boolean;
  reset_at?: string | null;
}

interface HealthStatus {
  ok: boolean;
  detail?: string;
  checkedAt: Date;
}

interface TierRefreshState {
  previousTier: XSubscriptionTier | null;
  highlight: boolean;
}

function relativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function isTokenExpired(account: XAccountItem): boolean {
  if (!account.tokenExpiresAt) return false;
  return new Date(account.tokenExpiresAt) < new Date();
}

export function ConnectedXAccounts({ initialAccounts }: { initialAccounts: XAccountItem[] }) {
  const params = useSearchParams();
  const { openWithContext } = useUpgradeModal();
  const shouldSync = params.get("sync") === "1";
  const [accounts, setAccounts] = useState<XAccountItem[]>(initialAccounts);
  const [busy, setBusy] = useState(false);
  const [healthStatus, setHealthStatus] = useState<Record<string, HealthStatus>>({});
  const [checking, setChecking] = useState<string | null>(null);
  const [refreshingTier, setRefreshingTier] = useState<string | null>(null);
  const [tierRefreshState, setTierRefreshState] = useState<Record<string, TierRefreshState>>({});
  const tierFetchRef = useRef(false);

  const syncNow = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/x/accounts/sync", { method: "POST" });
      if (!res.ok) {
        if (res.status === 402) {
          let payload: PlanLimitPayload | null = null;
          try {
            payload = (await res.json()) as PlanLimitPayload;
          } catch {
          }
          openWithContext({
            error: payload?.error,
            code: payload?.code,
            message: payload?.message,
            feature: payload?.feature,
            plan: payload?.plan,
            limit: payload?.limit,
            used: payload?.used,
            remaining: payload?.remaining,
            upgradeUrl: payload?.upgrade_url,
            suggestedPlan: payload?.suggested_plan,
            trialActive: payload?.trial_active,
            resetAt: payload?.reset_at,
          });
          return;
        }
        throw new Error("Sync failed");
      }
      const listRes = await fetch("/api/x/accounts", { method: "GET" });
      const data = await listRes.json();
      setAccounts(data.accounts || []);
      toast.success("Accounts synced. Paused posts have been automatically re-queued and will publish shortly.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }, [openWithContext]);

  useEffect(() => {
    if (!shouldSync) return;
    syncNow();
  }, [shouldSync, syncNow]);

  const handleHealthCheck = async (accountId: string) => {
    setChecking(accountId);
    try {
      const res = await fetch(`/api/x/health?accountId=${accountId}`, { method: "GET" });
      const data = await res.json().catch(() => null);
      const ok = res.ok && data?.ok === true;
      setHealthStatus((prev) => ({
        ...prev,
        [accountId]: {
          ok,
          detail: ok ? `Connected as @${data.user?.username}` : (data?.error ?? "Check failed"),
          checkedAt: new Date(),
        },
      }));
    } catch {
      setHealthStatus((prev) => ({
        ...prev,
        [accountId]: { ok: false, detail: "Check failed", checkedAt: new Date() },
      }));
    } finally {
      setChecking(null);
    }
  };

  const handleReconnect = async () => {
    await signIn.social({
      provider: "twitter",
      callbackURL: "/dashboard/settings?sync=1",
    });
  };

  const handleRefreshTier = async (accountId: string, currentTier: XSubscriptionTier) => {
    setRefreshingTier(accountId);
    setTierRefreshState((prev) => ({
      ...prev,
      [accountId]: { previousTier: currentTier, highlight: false },
    }));
    
    try {
      const res = await fetch("/api/x/subscription-tier/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountIds: [accountId] }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to refresh tier");
      }
      const result = data.results?.[0];
      if (result?.status === "refreshed") {
        const newTier = result.tier as XSubscriptionTier;
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === accountId
              ? { ...a, xSubscriptionTier: newTier, xSubscriptionTierUpdatedAt: result.updatedAt }
              : a
          )
        );
        
        const previousTier = tierRefreshState[accountId]?.previousTier ?? null;
        if (previousTier !== newTier) {
          setTierRefreshState((prev) => ({
            ...prev,
            [accountId]: { previousTier: previousTier, highlight: true },
          }));
          setTimeout(() => {
            setTierRefreshState((prev) => ({
              ...prev,
              [accountId]: { ...(prev[accountId] || { previousTier: null, highlight: false }), highlight: false },
            }));
          }, 300);
        }
        
        toast.success(`Subscription tier updated: ${result.tier}`);
      } else if (result?.status === "skipped_cooldown") {
        toast.info("Tier was recently refreshed. Please wait before refreshing again.");
      } else if (result?.status === "error") {
        toast.error(result.error || "Failed to refresh tier");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to refresh tier");
    } finally {
      setRefreshingTier(null);
    }
  };

  useEffect(() => {
    if (tierFetchRef.current) return;
    const accountsWithoutTier = accounts.filter((a) => !a.xSubscriptionTierUpdatedAt);
    if (accountsWithoutTier.length === 0) return;

    tierFetchRef.current = true;
    const refreshMissingTiers = async () => {
      const accountIds = accountsWithoutTier.map((a) => a.id);
      try {
        const res = await fetch("/api/x/subscription-tier/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountIds }),
        });
        const data = await res.json();
        if (res.ok && data.results) {
          const updates = new Map(data.results.map((r: { accountId: string; tier: string }) => [r.accountId, r.tier]));
          setAccounts((prev) =>
            prev.map((a) => {
              const tier = updates.get(a.id);
              return tier ? { ...a, xSubscriptionTier: tier as XSubscriptionTier } : a;
            })
          );
        }
      } catch {
      }
    };
    refreshMissingTiers();
  }, [accounts]);

  return (
    <TooltipProvider>
      <div className="space-y-4">
      {accounts.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">No accounts connected.</div>
      ) : (
        <div className="space-y-3">
          {accounts.map((a) => {
            const expired = isTokenExpired(a);
            const health = healthStatus[a.id];
            const isChecking = checking === a.id;
            const tierState = tierRefreshState[a.id];
            const tierUpdatedAt = a.xSubscriptionTierUpdatedAt ? new Date(a.xSubscriptionTierUpdatedAt) : null;
            const isTierUnknown = !a.xSubscriptionTierUpdatedAt;

            return (
              <div key={a.id} className="space-y-1.5">
                <div
                  className={`flex items-center justify-between gap-3 p-3 border rounded-lg ${
                    expired ? "border-destructive/40 bg-destructive/5" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 bg-muted rounded-full overflow-hidden shrink-0 relative">
                      {a.xAvatarUrl ? (
                        <Image src={a.xAvatarUrl} alt={a.xUsername} fill sizes="40px" className="object-cover" />
                      ) : (
                        <div className="h-10 w-10 flex items-center justify-center">
                          <Twitter className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold truncate">{a.xDisplayName || a.xUsername}</span>
                        <span className={`transition-all duration-300 ${tierState?.highlight ? "ring-2 ring-primary rounded-full p-0.5" : ""}`}>
                          <XSubscriptionBadge
                            tier={(a.xSubscriptionTier as XSubscriptionTier) ?? null}
                            size="sm"
                            loading={refreshingTier === a.id}
                            showUnknown={isTierUnknown}
                          />
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="truncate">@{a.xUsername}</span>
                        {tierUpdatedAt && (
                          <span className="text-xs shrink-0">
                            Checked {relativeTime(tierUpdatedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant={a.isDefault ? "default" : "outline"}
                      size="sm"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const res = await fetch("/api/x/accounts/default", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ xAccountId: a.id, isDefault: !a.isDefault }),
                          });
                          if (!res.ok) throw new Error("Failed to update default");
                          setAccounts((prev) =>
                            prev.map((x) => (x.id === a.id ? { ...x, isDefault: !a.isDefault } : x))
                          );
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Failed to update default");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Default
                    </Button>

                    {expired ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Expired
                      </Badge>
                    ) : (
                      <Badge variant={a.isActive ? "default" : "secondary"}>
                        {a.isActive ? "Active" : "Inactive"}
                      </Badge>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isChecking || busy}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Test connection for @${a.xUsername}`}
                      onClick={() => handleHealthCheck(a.id)}
                    >
                      <Activity
                        className={`h-4 w-4 ${isChecking ? "animate-pulse text-primary" : ""}`}
                      />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={refreshingTier === a.id || busy}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Refresh subscription tier for @${a.xUsername}`}
                      onClick={() => handleRefreshTier(a.id, (a.xSubscriptionTier as XSubscriptionTier) ?? null)}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${refreshingTier === a.id ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </div>
                </div>

                {expired && (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>
                        Token expired — posts to this account will fail until you reconnect.
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={handleReconnect}
                    >
                      Reconnect
                    </Button>
                  </div>
                )}

                {health && (
                  <div
                    className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs ${
                      health.ok
                        ? "border border-success/30 bg-success/5 text-success"
                        : "border border-destructive/30 bg-destructive/5 text-destructive"
                    }`}
                  >
                    {health.ok ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="flex-1 truncate">{health.detail}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {relativeTime(health.checkedAt)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          className="flex-1"
          variant="outline"
          disabled={busy}
          onClick={syncNow}
        >
          {busy ? "Syncing..." : "Sync accounts"}
        </Button>
      </div>
      </div>
    </TooltipProvider>
  );
}
