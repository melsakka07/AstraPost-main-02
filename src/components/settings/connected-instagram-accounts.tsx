"use client";

import { useState } from "react";
import Image from "next/image";
import { Instagram, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface InstagramAccount {
  id: string;
  instagramUsername: string;
  instagramAvatarUrl?: string | null;
  isActive: boolean | null;
}

export function ConnectedInstagramAccounts({
  initialAccounts,
}: {
  initialAccounts: InstagramAccount[];
}) {
  const t = useTranslations("settings");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingDisconnect, setPendingDisconnect] = useState<string | null>(null);

  const handleConnect = () => {
    window.location.href = "/api/instagram/auth";
  };

  const handleDisconnect = async () => {
    if (!pendingDisconnect) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/accounts/instagram/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: pendingDisconnect }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || "Failed to disconnect account");
        return;
      }

      toast.success(t("integrations.instagram_disconnected_success"));
      window.location.reload();
    } catch (error) {
      toast.error(t("integrations.disconnect_error"));
      (await import("@/lib/logger")).logger.error("Disconnect error", { error });
    } finally {
      setIsLoading(false);
      setPendingDisconnect(null);
    }
  };

  const accountToDisconnect = initialAccounts.find((a) => a.id === pendingDisconnect);

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-pink-600" />
            <CardTitle>{t("integrations.instagram_title")}</CardTitle>
          </div>
          <CardDescription>{t("integrations.instagram_description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {initialAccounts.length === 0 ? (
            <div className="text-muted-foreground py-4 text-center text-sm">
              {t("integrations.no_instagram_accounts")}
            </div>
          ) : (
            <div className="space-y-2">
              {initialAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-muted relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                      {account.instagramAvatarUrl ? (
                        <Image
                          src={account.instagramAvatarUrl}
                          alt={account.instagramUsername}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="bg-muted flex h-full w-full items-center justify-center">
                          <Instagram className="text-muted-foreground h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">@{account.instagramUsername}</div>
                      <div className="text-muted-foreground text-xs">
                        {account.isActive ? t("integrations.active") : t("integrations.inactive")}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPendingDisconnect(account.id)}
                    disabled={isLoading}
                  >
                    <Trash2 className="text-muted-foreground hover:text-destructive h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button variant="outline" className="w-full gap-2" onClick={handleConnect} disabled>
            <Plus className="h-4 w-4" />
            {t("integrations.connect_instagram")}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!pendingDisconnect}
        onOpenChange={(open) => !open && setPendingDisconnect(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("integrations.disconnect_instagram_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("integrations.disconnect_instagram_desc", {
                username: accountToDisconnect?.instagramUsername ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel disabled={isLoading}>{t("integrations.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} disabled={isLoading}>
              {isLoading ? t("integrations.disconnecting") : t("integrations.disconnect")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
