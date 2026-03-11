import Link from "next/link";
import { Rocket, Calendar, Sparkles, BarChart2 } from "lucide-react";
import { SocialProof } from "@/components/marketing/social-proof";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="py-20 md:py-32 px-4 text-center">
        <div className="container mx-auto max-w-5xl space-y-8">
          <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20">
             ✨ AI-Powered Social Media Growth
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent pb-2">
            Supercharge Your X Presence with AI
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Schedule threads, generate viral content with AI, and track your analytics. 
            AstroPost is the all-in-one tool for serious creators.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button size="lg" className="h-12 px-8 text-lg" asChild>
              <Link href="/dashboard">Get Started for Free</Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-lg">
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <SocialProof />

      {/* Features Grid */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything you need to grow</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Stop wasting time on manual posting. Automate your workflow with powerful tools designed for growth.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-background p-8 rounded-xl border shadow-sm">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Smart Scheduling</h3>
              <p className="text-muted-foreground">
                Plan your content weeks in advance. Drag and drop calendar view makes it easy to visualize your strategy.
              </p>
            </div>
            
            <div className="bg-background p-8 rounded-xl border shadow-sm">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">AI Writer</h3>
              <p className="text-muted-foreground">
                Generate viral threads, hook ideas, and polished tweets in seconds using our advanced AI models.
              </p>
            </div>

            <div className="bg-background p-8 rounded-xl border shadow-sm">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <BarChart2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Deep Analytics</h3>
              <p className="text-muted-foreground">
                Understand what works. Track impressions, engagement rates, and follower growth over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center space-y-8 bg-card border rounded-3xl p-12 shadow-lg">
           <Rocket className="h-12 w-12 text-primary mx-auto" />
           <h2 className="text-3xl font-bold">Ready to blast off?</h2>
           <p className="text-muted-foreground text-lg">
             Join thousands of creators who are growing their audience with AstroPost.
           </p>
           <Button size="lg" className="h-12 px-8" asChild>
             <Link href="/register">Start Your Free Trial</Link>
           </Button>
           <p className="text-xs text-muted-foreground">No credit card required • 14-day free trial</p>
        </div>
      </section>
    </div>
  );
}
