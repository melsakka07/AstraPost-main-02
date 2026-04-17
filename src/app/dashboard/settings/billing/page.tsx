import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { CreditCard } from "lucide-react";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { BillingStatus } from "@/components/settings/billing-status";
import { BillingSuccessPoller } from "@/components/settings/billing-success-poller";
import { ManageSubscriptionButton } from "@/components/settings/manage-subscription-button";
import { PlanUsage } from "@/components/settings/plan-usage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro_monthly: "Pro Monthly",
  pro_annual: "Pro Annual",
  agency: "Agency",
};

export default async function BillingSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ billing?: string | string[] }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?callbackUrl=/dashboard/settings/billing");

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const billingParam = resolvedSearchParams?.billing;
  const billingState = Array.isArray(billingParam) ? billingParam[0] : billingParam;

  const userRow = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });
  const currentPlan = userRow?.plan || "free";
  const hasStripeCustomerId = Boolean(userRow?.stripeCustomerId);
  const isPaidPlan = currentPlan !== "free";

  const billingNotice =
    billingState === "success"
      ? {
          tone: "success",
          text: "Payment completed successfully. Your subscription is now active.",
        }
      : billingState === "cancelled"
        ? { tone: "warning", text: "Checkout was canceled. You can resume anytime from this page." }
        : billingState === "portal_return"
          ? {
              tone: "info",
              text: "Returned from billing portal. Changes usually sync within a few moments.",
            }
          : billingState === "restore"
            ? {
                tone: "warning",
                text: "No active billing profile was found. Select a plan to restore billing access.",
              }
            : null;

  return (
    <DashboardPageWrapper
      icon={CreditCard}
      title="Billing & Subscription"
      description="Manage your subscription and billing details"
    >
      <div className="max-w-3xl space-y-6">
        {billingState === "success" && <BillingSuccessPoller initialPlan={currentPlan} />}

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Your current plan and billing details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {billingNotice && billingState !== "success" && (
              <div
                className={
                  billingNotice.tone === "warning"
                    ? "border-warning/40 bg-warning/10 text-warning rounded-md border px-4 py-3 text-sm"
                    : "border-border bg-muted/60 text-foreground rounded-md border px-4 py-3 text-sm"
                }
              >
                {billingNotice.text}
              </div>
            )}

            <div className="bg-muted/30 flex flex-col gap-3 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-muted-foreground mb-1 text-sm font-medium">Current Plan</div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="px-3 py-1 text-base">
                    {PLAN_LABELS[currentPlan] ?? currentPlan}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2">
                {hasStripeCustomerId ? (
                  <>
                    <Button variant="outline" className="w-full sm:w-auto" asChild>
                      <Link href="/pricing">Change Plan</Link>
                    </Button>
                    <ManageSubscriptionButton />
                  </>
                ) : isPaidPlan ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto" asChild>
                          <Link href="/pricing?billing=restore">Restore Billing</Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Your account is on a paid plan but no active payment was found. This can
                        happen after a failed renewal or manual plan assignment.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Button className="w-full sm:w-auto" asChild>
                    <Link href="/pricing">Upgrade Plan</Link>
                  </Button>
                )}
              </div>
            </div>

            <BillingStatus />

            <div className="text-muted-foreground px-2 text-xs">
              {hasStripeCustomerId
                ? "Use the billing portal to update payment methods, invoices, or cancellation settings."
                : isPaidPlan
                  ? "Your account is on a paid plan without an active billing profile. Restore billing to manage subscription details."
                  : "Upgrade to a paid plan to unlock billing portal access and self-service subscription management."}
            </div>

            <PlanUsage />
          </CardContent>
        </Card>
      </div>
    </DashboardPageWrapper>
  );
}
