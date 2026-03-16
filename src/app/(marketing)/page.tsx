import Link from "next/link";
import { Rocket, Calendar, Sparkles, BarChart2, ArrowRight } from "lucide-react";
import { HeroMockup } from "@/components/marketing/hero-mockup";
import { SocialProof } from "@/components/marketing/social-proof";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 py-20 md:py-32">
        {/* Background gradient blobs */}
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute left-1/2 top-0 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[600px] w-[600px] rounded-full bg-gradient-to-tl from-purple-500/10 to-transparent blur-3xl" />
        </div>

        {/* Hero copy — centered */}
        <div className="container relative mx-auto max-w-3xl space-y-8 text-center">
          <Badge variant="outline" className="px-4 py-1">
            ✨ AI-Powered Social Media Growth
          </Badge>

          <h1 className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text pb-2 text-5xl font-bold tracking-tight text-transparent md:text-7xl">
            Supercharge Your X Presence with AI
          </h1>

          <p className="mx-auto max-w-2xl text-xl leading-relaxed text-muted-foreground">
            Schedule threads, generate viral content with AI, and track your
            analytics. AstraPost is the all-in-one tool for serious creators.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
            <Button size="lg" className="h-12 px-8 text-lg group" asChild>
              <Link href="/register">
                Get Started for Free
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-lg" asChild>
              <Link href="/features">View Features</Link>
            </Button>
          </div>
        </div>

        {/* Dashboard mockup — sits below the CTA buttons */}
        <HeroMockup />
      </section>

      {/* Section divider */}
      <div
        aria-hidden="true"
        className="h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />

      {/* ── Social Proof ── */}
      <SocialProof />

      {/* ── Features Grid ── */}
      <section id="features" className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 space-y-4 text-center">
            <Badge variant="outline">Features</Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Everything you need to grow
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Stop wasting time on manual posting. Automate your workflow with
              powerful tools designed for growth.
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
            <div className="rounded-xl border bg-card p-8 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-3 text-xl font-bold">Smart Scheduling</h3>
              <p className="leading-relaxed text-muted-foreground">
                Plan your content weeks in advance. Drag and drop calendar view
                makes it easy to visualize your strategy.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-8 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-3 text-xl font-bold">AI Writer</h3>
              <p className="leading-relaxed text-muted-foreground">
                Generate viral threads, hook ideas, and polished tweets in
                seconds using our advanced AI models.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-8 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BarChart2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-3 text-xl font-bold">Deep Analytics</h3>
              <p className="leading-relaxed text-muted-foreground">
                Understand what works. Track impressions, engagement rates, and
                follower growth over time.
              </p>
            </div>
          </div>

          <div className="mt-16 text-center">
            <Button size="lg" variant="outline" asChild>
              <Link href="/features">
                Explore All Features
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="px-4 py-20">
        <div className="container mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-muted/50 to-muted/20 p-12 text-center shadow-xl">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-br from-primary/8 via-purple-500/6 to-pink-500/8"
            />
            <div className="relative space-y-6">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-500 text-white">
                <Rocket className="h-8 w-8" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Ready to blast off?
                </h2>
                <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                  Join thousands of creators who are growing their audience with
                  AstraPost.
                </p>
              </div>
              <div className="flex flex-col items-center justify-center gap-4 pt-2 sm:flex-row">
                <Button size="lg" className="h-12 px-8 text-lg group" asChild>
                  <Link href="/register">
                    Start Your Free Trial
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-8" asChild>
                  <Link href="/pricing">View Pricing</Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                No credit card required • 14-day free trial
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
