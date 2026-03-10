import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { User, CreditCard, Twitter } from "lucide-react";
import { ConnectedXAccounts } from "@/components/settings/connected-x-accounts";
import { ManageSubscriptionButton } from "@/components/settings/manage-subscription-button";
import { PlanUsage } from "@/components/settings/plan-usage";
import { XHealthCheckButton } from "@/components/settings/x-health-check-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, xAccounts } from "@/lib/schema";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const connectedAccounts = await db.query.xAccounts.findMany({
      where: eq(xAccounts.userId, session.user.id)
  });

  const userRow = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <div className="space-y-6">
        {/* Profile Section */}
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <CardTitle>Profile</CardTitle>
                </div>
                <CardDescription>Manage your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <div className="text-lg">{session.user.name}</div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <div className="text-lg">{session.user.email}</div>
                    </div>
                </div>
            </CardContent>
        </Card>

          {/* Plan Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle>Subscription</CardTitle>
              </div>
              <CardDescription>Your current plan and billing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Current Plan</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-lg px-3 py-1 uppercase">
                      {userRow?.plan || "free"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  {userRow?.stripeCustomerId ? (
                    <ManageSubscriptionButton />
                  ) : (
                    <Button variant="outline" asChild>
                      <a href="/pricing">Upgrade Plan</a>
                    </Button>
                  )}
                </div>
              </div>
              <PlanUsage />
            </CardContent>
          </Card>

        {/* Connected Accounts */}
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Twitter className="h-5 w-5 text-primary" />
                    <CardTitle>Connected Accounts</CardTitle>
                </div>
                <CardDescription>Manage your X (Twitter) accounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <ConnectedXAccounts initialAccounts={connectedAccounts} />
                <XHealthCheckButton />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
