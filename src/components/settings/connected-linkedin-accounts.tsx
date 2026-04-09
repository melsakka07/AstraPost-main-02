"use client";

import Image from "next/image";
import { Linkedin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
  const handleConnect = () => {
    window.location.href = "/api/linkedin/auth";
  };

  const handleDisconnect = async (_accountId: string) => {
    // Implement disconnect logic if needed
    toast.info("Disconnect feature coming soon");
  };

  return (
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
                <Button variant="ghost" size="icon" onClick={() => handleDisconnect(account.id)}>
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
  );
}
