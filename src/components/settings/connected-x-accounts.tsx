"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Twitter } from "lucide-react";
import { toast } from "sonner";
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

export function ConnectedXAccounts({ initialAccounts }: { initialAccounts: XAccountItem[] }) {
  const params = useSearchParams();
  const { openWithContext } = useUpgradeModal();
  const shouldSync = params.get("sync") === "1";
  const [accounts, setAccounts] = useState<XAccountItem[]>(initialAccounts);
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="space-y-4">
      {accounts.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">No accounts connected.</div>
      ) : (
        <div className="space-y-2">
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
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

              <div className="flex items-center gap-2">
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
                <Badge variant={a.isActive ? "default" : "secondary"}>
                  {a.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          ))}
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
          onClick={async () => {
            await signIn.social({ provider: "twitter", callbackURL: "/dashboard/settings?sync=1" });
          }}
        >
          Connect Another
        </Button>
      </div>
    </div>
  );
}
