import { headers } from "next/headers";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { Check, ArrowRight } from "lucide-react";
import { PricingTable } from "@/components/billing/pricing-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

export const metadata = {
  title: "Pricing | AstraPost",
  description: "Simple, transparent pricing for creators and teams.",
};

export default async function PricingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  let currentPlan = "free";

  if (session?.user?.id) {
    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { plan: true },
    });
    currentPlan = dbUser?.plan || "free";
  }

  return (
    <div className="relative min-h-dvh">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <Badge variant="outline" className="px-4 py-1">Pricing</Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Choose the plan that fits your needs. Upgrade or cancel anytime.
          </p>
        </div>

        {/* Trial Banner */}
        <div className="mx-auto max-w-2xl text-center rounded-lg border border-primary/20 bg-primary/5 p-4 -mt-8">
          <p className="text-sm font-medium text-primary">
            🎉 Start your 14-day free trial — access all Pro features, no credit card required.
          </p>
        </div>

        {/* Pricing Table */}
        <div className="flex justify-center">
          <PricingTable
            currentPlan={currentPlan}
            isLoggedIn={!!session}
          />
        </div>

        {/* Features Section */}
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge variant="outline" className="px-4 py-1">Features</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                All plans include these core features
              </h2>
              <p className="text-muted-foreground text-lg">
                Start with powerful tools and unlock more as you grow.
              </p>
              <Button size="lg" className="group" asChild>
                <Link href="/login">
                  Start for free
                  <ArrowRight className="ms-2 h-4 w-4 transition-transform group-hover:translate-x-1 rtl:scale-x-[-1] rtl:group-hover:-translate-x-1" />
                </Link>
              </Button>
            </div>
            <div className="space-y-4">
              {[
                "X (Twitter) Scheduling — post and schedule across X",
                "Smart Scheduling with timezone support",
                "AI Content Generation with multiple models",
                "Detailed Analytics and performance tracking",
                "Team Collaboration (Agency plan)",
                "Community & Email Support for all users"
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-foreground/90">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ CTA */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-muted/50 to-muted/20 p-8 md:p-12 text-center">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5" />
          <div className="relative">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Questions about pricing?
            </h3>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Our team is here to help you find the right plan for your needs.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" variant="outline" asChild>
                <Link href="/community">Contact Sales</Link>
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <Link href="/docs">View Documentation</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
