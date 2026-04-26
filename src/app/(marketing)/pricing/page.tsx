import { headers } from "next/headers";
import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { Check, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PricingTable } from "@/components/billing/pricing-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, subscriptions } from "@/lib/schema";

export const metadata = {
  title: "Pricing | AstraPost",
  description: "Simple, transparent pricing for creators and teams.",
};

export default async function PricingPage() {
  const t = await getTranslations("pricing");
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  let currentPlan = "free";
  let currentBillingCycle: "monthly" | "annual" | null = null;

  if (session?.user?.id) {
    try {
      const dbUser = await db.query.user.findFirst({
        where: eq(user.id, session.user.id),
        columns: { plan: true },
      });
      currentPlan = dbUser?.plan || "free";

      // Fetch current subscription price ID for billing cycle detection
      if (dbUser?.plan && dbUser.plan !== "free") {
        const sub = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.userId, session.user.id),
          columns: { stripePriceId: true },
          orderBy: desc(subscriptions.createdAt),
        });

        // Resolve the price ID to a billing cycle for agency tier
        if (dbUser.plan === "agency" && sub?.stripePriceId) {
          const monthlyPriceId = process.env.STRIPE_PRICE_ID_AGENCY_MONTHLY;
          const annualPriceId = process.env.STRIPE_PRICE_ID_AGENCY_ANNUAL;
          if (sub.stripePriceId === monthlyPriceId) {
            currentBillingCycle = "monthly";
          } else if (sub.stripePriceId === annualPriceId) {
            currentBillingCycle = "annual";
          }
        }
      }
    } catch (error) {
      console.error("[pricing] Failed to load user plan data", error);
      // Gracefully degrade — show pricing page without personalized state
    }
  }

  const featuresList = [
    t("feature_1"),
    t("feature_2"),
    t("feature_3"),
    t("feature_4"),
    t("feature_5"),
    t("feature_6"),
  ];

  return (
    <div className="relative min-h-dvh">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="from-primary/5 absolute top-0 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br via-purple-500/5 to-pink-500/5 blur-3xl" />
      </div>

      <div className="container mx-auto space-y-16 px-4 py-16 md:py-24">
        {/* Header */}
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <Badge variant="outline" className="px-4 py-1">
            {t("badge")}
          </Badge>
          <h1 className="from-foreground via-foreground to-foreground/70 bg-gradient-to-br bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-6xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-xl leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* Trial Banner */}
        <div className="border-primary/20 bg-primary/5 mx-auto -mt-8 max-w-2xl rounded-lg border p-4 text-center">
          <p className="text-primary text-sm font-medium">{t("trial_banner")}</p>
        </div>

        {/* Pricing Table */}
        <div className="flex justify-center">
          <PricingTable
            currentPlan={currentPlan}
            isLoggedIn={!!session}
            {...(currentBillingCycle != null && { currentBillingCycle })}
          />
        </div>

        {/* Features Section */}
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="space-y-6">
              <Badge variant="outline" className="px-4 py-1">
                {t("features_badge")}
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                {t("features_title")}
              </h2>
              <p className="text-muted-foreground text-lg">{t("features_subtitle")}</p>
              <Button size="lg" className="group" asChild>
                <Link href="/login">
                  {t("cta_start_free")}
                  <ArrowRight className="ms-2 h-4 w-4 transition-transform group-hover:translate-x-1 rtl:scale-x-[-1] rtl:group-hover:-translate-x-1" />
                </Link>
              </Button>
            </div>
            <div className="space-y-4">
              {featuresList.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="bg-primary/10 mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full">
                    <Check className="text-primary h-3.5 w-3.5" />
                  </div>
                  <span className="text-foreground/90">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ CTA */}
        <div className="border-border/50 from-muted/50 to-muted/20 relative overflow-hidden rounded-2xl border bg-gradient-to-br p-8 text-center md:p-12">
          <div className="from-primary/5 absolute inset-0 bg-gradient-to-r via-purple-500/5 to-pink-500/5" />
          <div className="relative">
            <h3 className="mb-4 text-2xl font-bold md:text-3xl">{t("faq_title")}</h3>
            <p className="text-muted-foreground mx-auto mb-8 max-w-xl">{t("faq_subtitle")}</p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" variant="outline" asChild>
                <a href="mailto:sales@astrapost.com">{t("contact_sales")}</a>
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <Link href="/docs">{t("view_docs")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
