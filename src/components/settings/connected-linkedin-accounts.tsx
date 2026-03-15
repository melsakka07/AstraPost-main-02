"use client";

import { useState } from "react";
import Image from "next/image";
import { Linkedin, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    setLoading(true);
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
          <div className="text-center py-4 text-muted-foreground text-sm">
            No LinkedIn accounts connected.
          </div>
        ) : (
          <div className="space-y-2">
            {initialAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-muted rounded-full overflow-hidden relative shrink-0">
                    {account.linkedinAvatarUrl ? (
                      <Image
                        src={account.linkedinAvatarUrl}
                        alt={account.linkedinName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-muted">
                        <Linkedin className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{account.linkedinName}</div>
                    <div className="text-xs text-muted-foreground">
                      {account.isActive ? "Active" : "Inactive"}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDisconnect(account.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleConnect}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Connect LinkedIn Account
        </Button>
      </CardContent>
    </Card>
  );
}
