import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { CreditCard } from "lucide-react";
import { getTranslations } from "next-intl/server";
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

export default async function BillingSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ billing?: string | string[] }>;
}) {
  const t = await getTranslations("settings");
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

  const planLabelMap: Record<string, string> = {
    free: t("billing.plan_free"),
    pro_monthly: t("billing.plan_pro_monthly"),
    pro_annual: t("billing.plan_pro_annual"),
    agency: t("billing.plan_agency"),
  };

  const billingNotice =
    billingState === "success"
      ? {
          tone: "success",
          text: t("billing.payment_success"),
        }
      : billingState === "cancelled"
        ? { tone: "warning", text: t("billing.checkout_canceled") }
        : billingState === "portal_return"
          ? {
              tone: "info",
              text: t("billing.portal_returned"),
            }
          : billingState === "restore"
            ? {
                tone: "warning",
                text: t("billing.no_billing_profile"),
              }
            : null;

  return (
    <DashboardPageWrapper
      icon={CreditCard}
      title={t("billing.title")}
      description={t("billing.description")}
    >
      <div className="max-w-3xl space-y-6">
        {billingState === "success" && <BillingSuccessPoller initialPlan={currentPlan} />}

        <Card>
          <CardHeader>
            <CardTitle>{t("billing.subscription_title")}</CardTitle>
            <CardDescription>{t("billing.subscription_description")}</CardDescription>
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
                <div className="text-muted-foreground mb-1 text-sm font-medium">
                  {t("billing.current_plan_label")}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="px-3 py-1 text-base">
                    {planLabelMap[currentPlan] ?? currentPlan}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2">
                {hasStripeCustomerId ? (
                  <>
                    <Button variant="outline" className="w-full sm:w-auto" asChild>
                      <Link href="/pricing">{t("billing.change_plan")}</Link>
                    </Button>
                    <ManageSubscriptionButton />
                  </>
                ) : isPaidPlan ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto" asChild>
                          <Link href="/pricing?billing=restore">
                            {t("billing.restore_billing")}
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t("billing.restore_tooltip")}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Button className="w-full sm:w-auto" asChild>
                    <Link href="/pricing">{t("billing.upgrade_plan")}</Link>
                  </Button>
                )}
              </div>
            </div>

            <BillingStatus />

            <div className="text-muted-foreground px-2 text-xs">
              {hasStripeCustomerId
                ? t("billing.portal_hint")
                : isPaidPlan
                  ? t("billing.no_billing_hint")
                  : t("billing.upgrade_hint")}
            </div>

            <PlanUsage />
          </CardContent>
        </Card>
      </div>
    </DashboardPageWrapper>
  );
}
