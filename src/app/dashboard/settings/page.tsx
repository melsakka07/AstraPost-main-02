import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { CreditCard, Twitter, Users, Settings as SettingsIcon } from "lucide-react";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { ConnectedInstagramAccounts } from "@/components/settings/connected-instagram-accounts";
import { ConnectedLinkedInAccounts } from "@/components/settings/connected-linkedin-accounts";
import { ConnectedXAccounts } from "@/components/settings/connected-x-accounts";
import { ManageSubscriptionButton } from "@/components/settings/manage-subscription-button";
import { PlanUsage } from "@/components/settings/plan-usage";
import { PrivacySettings } from "@/components/settings/privacy-settings";
import { ProfileForm } from "@/components/settings/profile-form";
import { SecuritySettings } from "@/components/settings/security-settings";
import { SettingsSectionNav } from "@/components/settings/settings-section-nav";
import { VoiceProfileForm } from "@/components/settings/voice-profile-form";
import { XHealthCheckButton } from "@/components/settings/x-health-check-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, xAccounts, linkedinAccounts, instagramAccounts } from "@/lib/schema";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ billing?: string | string[] }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?callbackUrl=/dashboard/settings");
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const billingParam = resolvedSearchParams?.billing;
  const billingState = Array.isArray(billingParam) ? billingParam[0] : billingParam;

  const connectedAccounts = await db.query.xAccounts.findMany({
      where: eq(xAccounts.userId, session.user.id)
  });

  const connectedLinkedInAccounts = await db.query.linkedinAccounts.findMany({
      where: eq(linkedinAccounts.userId, session.user.id)
  });

  const connectedInstagramAccounts = await db.query.instagramAccounts.findMany({
      where: eq(instagramAccounts.userId, session.user.id)
  });

  const userRow = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });
  const currentPlan = userRow?.plan || "free";
  const hasStripeCustomerId = Boolean(userRow?.stripeCustomerId);
  const isPaidPlan = currentPlan !== "free";

  const billingNotice =
    billingState === "success"
      ? { tone: "success", text: "Payment completed successfully. Your subscription is now active." }
      : billingState === "cancelled"
      ? { tone: "warning", text: "Checkout was canceled. You can resume anytime from this page." }
      : billingState === "portal_return"
      ? { tone: "info", text: "Returned from billing portal. Changes usually sync within a few moments." }
      : billingState === "restore"
      ? { tone: "warning", text: "No active billing profile was found. Select a plan to restore billing access." }
      : null;

  return (
    <DashboardPageWrapper
      icon={SettingsIcon}
      title="Settings"
      description="Manage your account, connections, and preferences."
    >
      <SettingsSectionNav />

      <div className="space-y-6">
        {/* Profile Section */}
        <div id="profile" className="scroll-mt-24">
          <ProfileForm
            initialData={{
              name: session.user.name,
              email: session.user.email,
              timezone: userRow?.timezone ?? null,
              language: userRow?.language ?? null
            }}
          />
        </div>

        {/* Subscription Section */}
        <div id="subscription" className="scroll-mt-24 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle>Subscription</CardTitle>
              </div>
              <CardDescription>Your current plan and billing details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {billingNotice && (
                <div
                  className={
                    billingNotice.tone === "success"
                      ? "rounded-md border border-success/40 bg-success/10 px-4 py-3 text-sm text-success"
                      : billingNotice.tone === "warning"
                      ? "rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning"
                      : "rounded-md border border-border bg-muted/60 px-4 py-3 text-sm text-foreground"
                  }
                >
                  {billingNotice.text}
                </div>
              )}
              <div className="flex flex-col gap-3 rounded-lg bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Current Plan</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-base px-3 py-1 uppercase">
                      {currentPlan}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  {hasStripeCustomerId ? (
                    <ManageSubscriptionButton />
                  ) : isPaidPlan ? (
                    <Button variant="outline" className="w-full sm:w-auto" asChild>
                      <Link href="/pricing?billing=restore">Restore Billing</Link>
                    </Button>
                  ) : (
                    <Button className="w-full sm:w-auto" asChild>
                      <Link href="/pricing">Upgrade Plan</Link>
                    </Button>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground px-2">
                {hasStripeCustomerId
                  ? "Use the billing portal to update payment methods, invoices, or cancellation settings."
                  : isPaidPlan
                  ? "Your account is on a paid plan without an active billing profile. Restore billing to manage subscription details."
                  : "Upgrade to a paid plan to unlock billing portal access and self-service subscription management."}
              </div>
              <PlanUsage />
            </CardContent>
          </Card>

          {/* Team Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Team Management</CardTitle>
              </div>
              <CardDescription>Invite team members and manage access roles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 rounded-lg bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  Collaborate with your team by inviting members to your workspace.
                </div>
                <Button variant="outline" className="w-full sm:w-auto" asChild>
                  <Link href="/dashboard/settings/team">Manage Team</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connected Accounts Section */}
        <div id="accounts" className="scroll-mt-24">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Twitter className="h-5 w-5 text-primary" />
                  <CardTitle>X (Twitter)</CardTitle>
                </div>
                <CardDescription>Manage your X accounts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ConnectedXAccounts initialAccounts={connectedAccounts} />
                <XHealthCheckButton />
              </CardContent>
            </Card>

            <ConnectedLinkedInAccounts
              initialAccounts={connectedLinkedInAccounts.map(a => ({
                id: a.id,
                linkedinName: a.linkedinName,
                linkedinAvatarUrl: a.linkedinAvatarUrl,
                isActive: a.isActive
              }))}
            />

            <ConnectedInstagramAccounts
              initialAccounts={connectedInstagramAccounts.map(a => ({
                id: a.id,
                instagramUsername: a.instagramUsername,
                instagramAvatarUrl: a.instagramAvatarUrl,
                isActive: a.isActive
              }))}
            />
          </div>
        </div>

        {/* AI Voice Section */}
        <div id="voice" className="scroll-mt-24">
          <VoiceProfileForm />
        </div>

        {/* Security Section */}
        <div id="security" className="scroll-mt-24">
          <SecuritySettings />
        </div>

        {/* Privacy Section */}
        <div id="privacy" className="scroll-mt-24">
          <PrivacySettings />
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
