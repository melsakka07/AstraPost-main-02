import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Zap, Users, Twitter } from "lucide-react";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { ConnectedInstagramAccounts } from "@/components/settings/connected-instagram-accounts";
import { ConnectedLinkedInAccounts } from "@/components/settings/connected-linkedin-accounts";
import { ConnectedXAccounts } from "@/components/settings/connected-x-accounts";
import { PrivacySettings } from "@/components/settings/privacy-settings";
import { VoiceProfileForm } from "@/components/settings/voice-profile-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, xAccounts, linkedinAccounts, instagramAccounts } from "@/lib/schema";

export default async function IntegrationsSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?callbackUrl=/dashboard/settings/integrations");

  const connectedAccounts = await db.query.xAccounts.findMany({
    where: eq(xAccounts.userId, session.user.id),
  });

  const connectedLinkedInAccounts = await db.query.linkedinAccounts.findMany({
    where: eq(linkedinAccounts.userId, session.user.id),
  });

  const connectedInstagramAccounts = await db.query.instagramAccounts.findMany({
    where: eq(instagramAccounts.userId, session.user.id),
  });

  const userRow = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });
  const currentPlan = userRow?.plan || "free";

  return (
    <DashboardPageWrapper
      icon={Zap}
      title="Integrations & Accounts"
      description="Manage your connected social media accounts and integrations"
    >
      <div className="space-y-6">
        {/* Connected Accounts Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Connected Accounts</h2>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Twitter className="text-primary h-5 w-5" />
                  <CardTitle>X (Twitter)</CardTitle>
                </div>
                <CardDescription>Manage your X accounts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ConnectedXAccounts initialAccounts={connectedAccounts} userPlan={currentPlan} />
              </CardContent>
            </Card>

            <ConnectedLinkedInAccounts
              initialAccounts={connectedLinkedInAccounts.map((a) => ({
                id: a.id,
                linkedinName: a.linkedinName,
                linkedinAvatarUrl: a.linkedinAvatarUrl,
                isActive: a.isActive,
              }))}
            />

            <ConnectedInstagramAccounts
              initialAccounts={connectedInstagramAccounts.map((a) => ({
                id: a.id,
                instagramUsername: a.instagramUsername,
                instagramAvatarUrl: a.instagramAvatarUrl,
                isActive: a.isActive,
              }))}
            />
          </div>
        </div>

        {/* Voice Profile Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">AI Voice Profile</h2>
          <VoiceProfileForm userPlan={currentPlan} />
        </div>

        {/* Privacy Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Privacy & Security</h2>
          <PrivacySettings />
        </div>

        {/* Team Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="text-primary h-5 w-5" />
              <CardTitle>Team Management</CardTitle>
            </div>
            <CardDescription>Invite team members and manage access roles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 flex flex-col gap-3 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-muted-foreground text-sm">
                Collaborate with your team by inviting members to your workspace.
              </div>
              <Button variant="outline" className="w-full sm:w-auto" asChild>
                <Link href="/dashboard/settings/team">Manage Team</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardPageWrapper>
  );
}
