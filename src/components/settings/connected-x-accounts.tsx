"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Info,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  Twitter,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { XSubscriptionBadge, type XSubscriptionTier } from "@/components/ui/x-subscription-badge";
import { signIn } from "@/lib/auth-client";
import { getPlanLimits } from "@/lib/plan-limits";

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

interface AccountToRemove {
  id: string;
  xUsername: string;
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

interface ConnectedXAccountsProps {
  initialAccounts: XAccountItem[];
  userPlan?: string;
}

export function ConnectedXAccounts({ initialAccounts, userPlan = "free" }: ConnectedXAccountsProps) {
  const params = useSearchParams();
  const { openWithContext } = useUpgradeModal();
  const shouldSync = params.get("sync") === "1";
  const [accounts, setAccounts] = useState<XAccountItem[]>(initialAccounts);
  const [busy, setBusy] = useState(false);
  const [healthStatus, setHealthStatus] = useState<Record<string, HealthStatus>>({});
  const [checking, setChecking] = useState<string | null>(null);
  const [refreshingTier, setRefreshingTier] = useState<string | null>(null);
  const [tierRefreshState, setTierRefreshState] = useState<Record<string, TierRefreshState>>({});
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState<AccountToRemove | null>(null);
  const tierFetchRef = useRef(false);

  // Calculate plan limit and active account count
  const planLimit = getPlanLimits(userPlan).maxXAccounts;
  const activeCount = accounts.filter((a) => a.isActive).length;
  const isOverLimit = activeCount > planLimit;

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

  const handleAddAccount = async () => {
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

  const handleRemoveAccount = async () => {
    if (!showRemoveDialog) return;

    // Prevent removing the last remaining account
    if (accounts.length === 1) {
      toast.error("Cannot remove the last connected account. Please add another account first.");
      setShowRemoveDialog(null);
      return;
    }

    setDeletingAccountId(showRemoveDialog.id);
    try {
      const res = await fetch(`/api/x/accounts/${showRemoveDialog.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove account");
      }

      setAccounts((prev) => prev.filter((a) => a.id !== showRemoveDialog.id));
      toast.success(`Account @${showRemoveDialog.xUsername} removed successfully`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove account");
    } finally {
      setDeletingAccountId(null);
      setShowRemoveDialog(null);
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

  // Format plan name for display
  const planName = userPlan === "free" ? "Free" : userPlan === "pro_monthly" || userPlan === "pro_annual" ? "Pro" : "Agency";

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Over-limit warning banner */}
        {isOverLimit && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>
              <p className="font-medium">Account limit exceeded</p>
              <p className="text-xs opacity-90 mt-0.5">
                Your {planName} plan allows {planLimit} X account{planLimit !== 1 ? "s" : ""}. You have {activeCount} active account{activeCount !== 1 ? "s" : ""}.
                Please remove {activeCount - planLimit} account{activeCount - planLimit !== 1 ? "s" : ""} or <Link href="/pricing" className="underline font-medium hover:text-amber-700 dark:hover:text-amber-300">upgrade</Link> your plan.
              </p>
            </div>
          </div>
        )}

        {accounts.length === 0 ? (
          <div className="py-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">No accounts connected yet.</p>
            <Button onClick={handleAddAccount} disabled={busy}>
              <Plus className="h-4 w-4 mr-2" />
              Connect X Account
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button variant="outline" onClick={handleAddAccount} disabled={busy}>
              <Plus className="h-4 w-4 mr-2" />
              Connect X Account
            </Button>
            <div className="flex items-start gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <p>
                  Click <strong>Connect X Account</strong> to add another X account while logged in.
                  Pro plan: up to 3 accounts · Agency: up to 10 accounts.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {accounts.map((a) => {
              const expired = isTokenExpired(a);
              const health = healthStatus[a.id];
              const isChecking = checking === a.id;
              const tierState = tierRefreshState[a.id];
              const tierUpdatedAt = a.xSubscriptionTierUpdatedAt
                ? new Date(a.xSubscriptionTierUpdatedAt)
                : null;
              const isTierUnknown = !a.xSubscriptionTierUpdatedAt;

              return (
                <div key={a.id} className="space-y-1.5">
                  {/* Account row */}
                  <div
                    className={`rounded-lg border p-3 transition-colors ${
                      expired
                        ? "border-destructive/40 bg-destructive/5"
                        : "bg-card"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="relative mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted sm:h-10 sm:w-10">
                        {a.xAvatarUrl ? (
                          <Image
                            src={a.xAvatarUrl}
                            alt={a.xDisplayName || a.xUsername}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Twitter className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Identity */}
                      <div className="min-w-0 flex-1">
                        {/* Name + tier badge */}
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-semibold leading-snug">
                            {a.xDisplayName || a.xUsername}
                          </span>
                          <span
                            className={`transition-all duration-300 ${
                              tierState?.highlight
                                ? "rounded-full p-0.5 ring-2 ring-primary"
                                : ""
                            }`}
                          >
                            <XSubscriptionBadge
                              tier={(a.xSubscriptionTier as XSubscriptionTier) ?? null}
                              size="sm"
                              loading={refreshingTier === a.id}
                              showUnknown={isTierUnknown}
                            />
                          </span>
                        </div>

                        {/* Username + status badge + tier timestamp */}
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                          <span className="text-sm text-muted-foreground">
                            @{a.xUsername}
                          </span>
                          {expired ? (
                            <Badge
                              variant="destructive"
                              className="h-4 gap-1 px-1.5 py-0 text-[10px]"
                            >
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Expired
                            </Badge>
                          ) : (
                            <Badge
                              variant={a.isActive ? "default" : "secondary"}
                              className="h-4 px-1.5 py-0 text-[10px]"
                            >
                              {a.isActive ? "Active" : "Inactive"}
                            </Badge>
                          )}
                          {tierUpdatedAt && (
                            <span className="text-xs text-muted-foreground/60">
                              · {relativeTime(tierUpdatedAt)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons — 3 compact icon buttons */}
                      <div className="flex shrink-0 items-center">
                        {/* Default toggle */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={busy}
                              className={
                                a.isDefault
                                  ? "h-8 w-8 p-0 text-primary hover:text-primary"
                                  : "h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              }
                              aria-label={
                                a.isDefault ? "Default account" : "Set as default"
                              }
                              onClick={async () => {
                                setBusy(true);
                                try {
                                  const res = await fetch("/api/x/accounts/default", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      xAccountId: a.id,
                                      isDefault: !a.isDefault,
                                    }),
                                  });
                                  if (!res.ok) throw new Error("Failed to update default");
                                  setAccounts((prev) =>
                                    prev.map((x) =>
                                      x.id === a.id
                                        ? { ...x, isDefault: !a.isDefault }
                                        : x
                                    )
                                  );
                                } catch (e) {
                                  toast.error(
                                    e instanceof Error ? e.message : "Failed to update default"
                                  );
                                } finally {
                                  setBusy(false);
                                }
                              }}
                            >
                              <Star
                                className={`h-4 w-4 transition-all ${
                                  a.isDefault ? "fill-current" : ""
                                }`}
                              />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            {a.isDefault ? "Default account" : "Set as default"}
                          </TooltipContent>
                        </Tooltip>

                        {/* Test connection */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isChecking || busy}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              aria-label={`Test connection for @${a.xUsername}`}
                              onClick={() => handleHealthCheck(a.id)}
                            >
                              <Activity
                                className={`h-4 w-4 ${
                                  isChecking ? "animate-pulse text-primary" : ""
                                }`}
                              />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            Test connection
                          </TooltipContent>
                        </Tooltip>

                        {/* Refresh subscription tier */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={refreshingTier === a.id || busy}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              aria-label={`Refresh subscription tier for @${a.xUsername}`}
                              onClick={() =>
                                handleRefreshTier(
                                  a.id,
                                  (a.xSubscriptionTier as XSubscriptionTier) ?? null
                                )
                              }
                            >
                              <RefreshCw
                                className={`h-4 w-4 ${
                                  refreshingTier === a.id ? "animate-spin" : ""
                                }`}
                              />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            Refresh tier
                          </TooltipContent>
                        </Tooltip>

                        {/* Remove account */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={deletingAccountId === a.id || busy}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              aria-label={`Remove account @${a.xUsername}`}
                              onClick={() =>
                                setShowRemoveDialog({ id: a.id, xUsername: a.xUsername })
                              }
                            >
                              <Trash2
                                className={`h-4 w-4 ${
                                  deletingAccountId === a.id ? "animate-pulse" : ""
                                }`}
                              />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            Remove account
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>

                  {/* Expired token warning */}
                  {expired && (
                    <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>
                          Token expired — posts will fail until you reconnect.
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

                  {/* Health check result */}
                  {health && (
                    <div
                      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs ${
                        health.ok
                          ? "border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
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
          </div>
        )}

        {/* Footer: info box + sync button */}
        <div className="space-y-2">
          <div className="flex items-start gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div className="space-y-0.5">
              <p>
                <span className="font-medium text-foreground">Character limits:</span>{" "}
                Free X accounts can post up to 280 characters. X Premium subscribers
                can post up to 2,000 characters per post.
              </p>
              <p>
                The colored dot next to each account shows its subscription tier.
                Use the refresh icon to update tier status.
              </p>
            </div>
          </div>
          <Button variant="outline" className="w-full" disabled={busy} onClick={syncNow}>
            {busy ? "Syncing..." : "Sync accounts"}
          </Button>
        </div>

        {/* Remove account confirmation dialog */}
        <AlertDialog
          open={showRemoveDialog !== null}
          onOpenChange={(open) => !open && setShowRemoveDialog(null)}
        >
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove @{showRemoveDialog?.xUsername}?</AlertDialogTitle>
              <AlertDialogDescription>
                Scheduled posts for this account will be cancelled. You cannot undo this action.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingAccountId !== null}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleRemoveAccount}
                disabled={deletingAccountId !== null}
              >
                {deletingAccountId ? "Removing..." : "Remove"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
