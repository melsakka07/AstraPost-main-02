import { headers } from "next/headers";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { Check } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { PricingTable } from "@/components/billing/pricing-table";

export const metadata = {
  title: "Pricing | AstroPost",
  description: "Simple, transparent pricing for creators and teams.",
};

export default async function PricingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  let currentPlan = "free";
  let hasBillingProfile = false;

  if (session?.user?.id) {
    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { plan: true, stripeCustomerId: true },
    });
    currentPlan = dbUser?.plan || "free";
    hasBillingProfile = !!dbUser?.stripeCustomerId;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center border-b">
        <Link className="flex items-center justify-center" href="/">
          <span className="font-bold text-xl">AstraPost</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          {session ? (
             <Link className="text-sm font-medium hover:underline underline-offset-4" href="/dashboard">
               Dashboard
             </Link>
          ) : (
             <>
               <Link className="text-sm font-medium hover:underline underline-offset-4" href="/login">
                 Log In
               </Link>
               <Link className="text-sm font-medium hover:underline underline-offset-4" href="/register">
                 Get Started
               </Link>
             </>
          )}
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
          <div className="container px-4 md:px-6 mx-auto text-center space-y-4">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Choose the plan that fits your needs. Upgrade or cancel anytime.
            </p>
          </div>
          
          <div className="mt-8">
            <PricingTable 
                currentPlan={currentPlan} 
                hasBillingProfile={hasBillingProfile}
                isLoggedIn={!!session}
            />
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 border-t">
          <div className="container px-4 md:px-6 mx-auto">
             <div className="grid gap-10 sm:px-10 md:gap-16 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
                    Features
                  </div>
                  <h2 className="lg:leading-tighter text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl xl:text-[3.4rem] 2xl:text-[3.75rem]">
                    All plans include these core features
                  </h2>
                  <Link
                    className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    href="/register"
                  >
                    Start for free
                  </Link>
                </div>
                <div className="flex flex-col items-start space-y-4">
                  <ul className="grid gap-4">
                     {[
                        "Smart Scheduling",
                        "Multi-platform Support (X, LinkedIn, Instagram)",
                        "AI Content Generation",
                        "Detailed Analytics",
                        "Team Collaboration (Agency)",
                        "Priority Support"
                     ].map((item) => (
                        <li key={item} className="flex items-center gap-2">
                            <Check className="h-5 w-5 text-primary" />
                            <span>{item}</span>
                        </li>
                     ))}
                  </ul>
                </div>
             </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">© 2024 AstroPost. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="/roadmap">
            Public Roadmap
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
