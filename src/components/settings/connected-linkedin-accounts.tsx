"use client";

import { useState } from "react";
import Image from "next/image";
import { Linkedin, Plus, Trash2 } from "lucide-react";
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

interface LinkedInAccount {
  id: string;
  linkedinName: string;
  linkedinAvatarUrl?: string | null;
  isActive: boolean | null;
}

export function ConnectedLinkedInAccounts({
  initialAccounts,
}: {
  initialAccounts: LinkedInAccount[];
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [pendingDisconnect, setPendingDisconnect] = useState<string | null>(null);

  const handleConnect = () => {
    window.location.href = "/api/linkedin/auth";
  };

  const handleDisconnect = async () => {
    if (!pendingDisconnect) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/accounts/linkedin/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: pendingDisconnect }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || "Failed to disconnect account");
        return;
      }

      toast.success("LinkedIn account disconnected successfully");
      window.location.reload();
    } catch (error) {
      toast.error("An error occurred while disconnecting the account");
      console.error("Disconnect error:", error);
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
            <Linkedin className="h-5 w-5 text-[#0077b5]" />
            <CardTitle>LinkedIn Accounts</CardTitle>
          </div>
          <CardDescription>Manage your connected LinkedIn profiles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {initialAccounts.length === 0 ? (
            <div className="text-muted-foreground py-4 text-center text-sm">
              No LinkedIn accounts connected.
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
                      {account.linkedinAvatarUrl ? (
                        <Image
                          src={account.linkedinAvatarUrl}
                          alt={account.linkedinName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="bg-muted flex h-full w-full items-center justify-center">
                          <Linkedin className="text-muted-foreground h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{account.linkedinName}</div>
                      <div className="text-muted-foreground text-xs">
                        {account.isActive ? "Active" : "Inactive"}
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
            Connect LinkedIn Account
          </Button>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!pendingDisconnect}
        onOpenChange={(open) => !open && setPendingDisconnect(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect LinkedIn Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect {accountToDisconnect?.linkedinName}? You can
              reconnect it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} disabled={isLoading}>
              {isLoading ? "Disconnecting..." : "Disconnect"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
