import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { CreditCard, Twitter } from "lucide-react";
import { ConnectedXAccounts } from "@/components/settings/connected-x-accounts";
import { ManageSubscriptionButton } from "@/components/settings/manage-subscription-button";
import { PlanUsage } from "@/components/settings/plan-usage";
import { ProfileForm } from "@/components/settings/profile-form";
import { VoiceProfileForm } from "@/components/settings/voice-profile-form";
import { SecuritySettings } from "@/components/settings/security-settings";
import { PrivacySettings } from "@/components/settings/privacy-settings";
import { XHealthCheckButton } from "@/components/settings/x-health-check-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, xAccounts } from "@/lib/schema";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ billing?: string | string[] }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const billingParam = resolvedSearchParams?.billing;
  const billingState = Array.isArray(billingParam) ? billingParam[0] : billingParam;

  const connectedAccounts = await db.query.xAccounts.findMany({
      where: eq(xAccounts.userId, session.user.id)
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
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <div className="space-y-6">
        {/* Profile Section */}
        <ProfileForm 
            initialData={{
                name: session.user.name,
                email: session.user.email,
                timezone: userRow?.timezone ?? null,
                language: userRow?.language ?? null
            }}
        />

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
              {billingNotice && (
                <div
                  className={
                    billingNotice.tone === "success"
                      ? "mb-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
                      : billingNotice.tone === "warning"
                      ? "mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300"
                      : "mb-4 rounded-md border border-border bg-muted/60 px-3 py-2 text-sm text-foreground"
                  }
                >
                  {billingNotice.text}
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Current Plan</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-lg px-3 py-1 uppercase">
                      {currentPlan}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  {hasStripeCustomerId ? (
                    <ManageSubscriptionButton />
                  ) : isPaidPlan ? (
                    <Button variant="outline" asChild>
                      <a href="/pricing?billing=restore">Restore Billing</a>
                    </Button>
                  ) : (
                    <Button variant="outline" asChild>
                      <a href="/pricing">Upgrade Plan</a>
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                {hasStripeCustomerId
                  ? "Use the billing portal to update payment methods, invoices, or cancellation settings."
                  : isPaidPlan
                  ? "Your account is on a paid plan without an active billing profile. Restore billing to manage subscription details."
                  : "Upgrade to a paid plan to unlock billing portal access and self-service subscription management."}
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

        <VoiceProfileForm />
        
        <SecuritySettings />
        
        <PrivacySettings />
      </div>
    </div>
  );
}
