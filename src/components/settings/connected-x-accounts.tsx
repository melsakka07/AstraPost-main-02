"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Activity, AlertTriangle, CheckCircle2, Twitter, XCircle } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { signIn } from "@/lib/auth-client";

type XAccountItem = {
  id: string;
  xUsername: string;
  xDisplayName?: string | null;
  xAvatarUrl?: string | null;
  isActive?: boolean | null;
  isDefault?: boolean | null;
  /** Date from server or ISO string after RSC serialization; null if token has no expiry */
  tokenExpiresAt?: Date | string | null;
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

// S3 — per-account health state
interface HealthStatus {
  ok: boolean;
  detail?: string;
  checkedAt: Date;
}

function relativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
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
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  // S3 — per-account health status
  const [healthStatus, setHealthStatus] = useState<Record<string, HealthStatus>>({});
  const [checking, setChecking] = useState<string | null>(null);

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
      toast.success("Accounts synced");
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

  // S2 — disconnect handler
  const handleDisconnect = async (accountId: string, username: string) => {
    setDisconnecting(accountId);
    try {
      const res = await fetch(`/api/x/accounts/${accountId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disconnect account");
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      setHealthStatus((prev) => {
        const next = { ...prev };
        delete next[accountId];
        return next;
      });
      toast.success(`@${username} disconnected`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Disconnect failed");
    } finally {
      setDisconnecting(null);
    }
  };

  // S3 — per-account health check
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

  return (
    <div className="space-y-4">
      {accounts.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">No accounts connected.</div>
      ) : (
        <div className="space-y-3">
          {accounts.map((a) => {
            const expired = isTokenExpired(a);
            const health = healthStatus[a.id];
            const isChecking = checking === a.id;

            return (
              <div key={a.id} className="space-y-1.5">
                {/* Account row */}
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
                      <div className="font-bold truncate">{a.xDisplayName || a.xUsername}</div>
                      <div className="text-sm text-muted-foreground truncate">@{a.xUsername}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Default toggle */}
                    <Button
                      type="button"
                      variant={a.isDefault ? "default" : "outline"}
                      size="sm"
                      disabled={busy || !!disconnecting}
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

                    {/* Active/Expired status badge */}
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

                    {/* S3 — per-account test button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isChecking || busy || !!disconnecting}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Test connection for @${a.xUsername}`}
                      onClick={() => handleHealthCheck(a.id)}
                    >
                      <Activity
                        className={`h-4 w-4 ${isChecking ? "animate-pulse text-primary" : ""}`}
                      />
                    </Button>

                    {/* S2 — Disconnect with confirmation */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy || disconnecting === a.id}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Disconnect @${a.xUsername}`}
                        >
                          {disconnecting === a.id ? "Removing…" : "Disconnect"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Disconnect @{a.xUsername}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove the account from AstraPost. Any scheduled posts
                            using this account will fail. You can reconnect at any time.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDisconnect(a.id, a.xUsername)}
                          >
                            Disconnect
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* S1 — Expired token warning with in-page reconnect */}
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

                {/* S3 — health check result strip */}
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
        <Button
          className="flex-1"
          variant="outline"
          onClick={handleReconnect}
        >
          Connect Another
        </Button>
      </div>
    </div>
  );
}
