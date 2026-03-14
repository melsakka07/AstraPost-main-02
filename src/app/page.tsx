import Link from "next/link";
import { Rocket, Calendar, Sparkles, BarChart2, ArrowRight } from "lucide-react";
import { SocialProof } from "@/components/marketing/social-proof";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 px-4 overflow-hidden">
        {/* Hero gradient */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-purple-500/10 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto max-w-5xl space-y-8 relative">
          <Badge variant="outline" className="px-4 py-1">
             ✨ AI-Powered Social Media Growth
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent pb-2">
            Supercharge Your X Presence with AI
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Schedule threads, generate viral content with AI, and track your analytics.
            AstroPost is the all-in-one tool for serious creators.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
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
      </section>

      {/* Social Proof */}
      <SocialProof />

      {/* Features Grid */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <Badge variant="outline">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Everything you need to grow</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Stop wasting time on manual posting. Automate your workflow with powerful tools designed for growth.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-card p-8 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Smart Scheduling</h3>
              <p className="text-muted-foreground leading-relaxed">
                Plan your content weeks in advance. Drag and drop calendar view makes it easy to visualize your strategy.
              </p>
            </div>

            <div className="bg-card p-8 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">AI Writer</h3>
              <p className="text-muted-foreground leading-relaxed">
                Generate viral threads, hook ideas, and polished tweets in seconds using our advanced AI models.
              </p>
            </div>

            <div className="bg-card p-8 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <BarChart2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Deep Analytics</h3>
              <p className="text-muted-foreground leading-relaxed">
                Understand what works. Track impressions, engagement rates, and follower growth over time.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button size="lg" variant="outline" asChild>
              <Link href="/features">
                Explore All Features
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-muted/50 to-muted/20 p-12 shadow-lg text-center space-y-8">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5" />
            <div className="relative">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-500 text-white mb-6">
                <Rocket className="h-8 w-8" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Ready to blast off?</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Join thousands of creators who are growing their audience with AstroPost.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Button size="lg" className="group" asChild>
                  <Link href="/register">
                    Start Your Free Trial
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/pricing">View Pricing</Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">No credit card required • 14-day free trial</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
