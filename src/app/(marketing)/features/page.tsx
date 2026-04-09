import Link from "next/link";
import { Calendar, Sparkles, BarChart2, Zap, Users, Globe, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features",
  description:
    "AstraPost provides a comprehensive suite of tools to help you grow your audience, engage with your community, and monetize your content.",
  alternates: { canonical: "/features" },
  openGraph: {
    title: "Features — AstraPost",
    description:
      "AstraPost provides a comprehensive suite of tools to help you grow your audience, engage with your community, and monetize your content.",
    url: "/features",
  },
};

export default function FeaturesPage() {
  const features = [
    {
      icon: <Calendar className="text-primary h-6 w-6" />,
      title: "Smart Scheduling",
      description:
        "Plan your content weeks in advance. Drag and drop calendar view makes it easy to visualize your strategy.",
      details: [
        "Visual calendar view",
        "Best time to post recommendations",
        "Drag & drop rescheduling",
        "Timezone management",
      ],
    },
    {
      icon: <Sparkles className="text-primary h-6 w-6" />,
      title: "AI Writer",
      description:
        "Generate viral threads, hook ideas, and polished tweets in seconds using our advanced AI models.",
      details: [
        "Thread generation from topics",
        "Tone adjustment",
        "Hashtag suggestions",
        "Content rephrasing",
      ],
    },
    {
      icon: <BarChart2 className="text-primary h-6 w-6" />,
      title: "Deep Analytics",
      description:
        "Understand what works. Track impressions, engagement rates, and follower growth over time.",
      details: [
        "Engagement metrics",
        "Follower growth tracking",
        "Top performing posts",
        "Exportable reports",
      ],
    },
    {
      icon: <Zap className="text-primary h-6 w-6" />,
      title: "Affiliate Generator",
      description: "Turn product links into high-converting tweets automatically.",
      details: [
        "Amazon & generic link support",
        "Automatic metadata extraction",
        "Conversion-optimized copy",
        "Affiliate tag insertion",
      ],
    },
    {
      icon: <Users className="text-primary h-6 w-6" />,
      title: "Team Collaboration",
      description: "Work together with your team. Assign roles and manage multiple accounts.",
      details: ["Multi-user access", "Approval workflows", "Shared media library", "Activity logs"],
    },
    {
      icon: <Globe className="text-primary h-6 w-6" />,
      title: "Cross-Posting",
      description: "Sync your content across platforms (Coming Soon).",
      details: [
        "LinkedIn integration",
        "Threads integration",
        "Customizable formats per platform",
        "Unified inbox",
      ],
    },
  ];

  return (
    <div className="relative min-h-dvh">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="from-primary/5 absolute top-0 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br via-purple-500/5 to-pink-500/5 blur-3xl" />
      </div>

      <div className="container mx-auto space-y-20 px-4 py-16 md:py-24">
        {/* Header */}
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <Badge variant="outline" className="px-4 py-1">
            Features
          </Badge>
          <h1 className="from-foreground via-foreground to-foreground/70 bg-gradient-to-br bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-6xl">
            Everything you need to master X
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-xl leading-relaxed">
            AstraPost provides a comprehensive suite of tools to help you grow your audience, engage
            with your community, and monetize your content.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-card rounded-xl border p-8 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="bg-primary/10 mb-6 flex h-12 w-12 items-center justify-center rounded-lg">
                {feature.icon}
              </div>
              <h3 className="mb-3 text-xl font-bold">{feature.title}</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">{feature.description}</p>
              <ul className="space-y-2">
                {feature.details.map((detail, i) => (
                  <li key={i} className="text-muted-foreground flex items-center text-sm">
                    <div className="bg-primary mr-2 h-1.5 w-1.5 rounded-full" />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="border-border/50 from-muted/50 to-muted/20 relative overflow-hidden rounded-2xl border bg-gradient-to-br p-8 text-center shadow-lg md:p-12">
          <div className="from-primary/8 absolute inset-0 bg-gradient-to-br via-purple-500/6 to-pink-500/8" />
          <div className="relative">
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">Ready to get started?</h2>
            <p className="text-muted-foreground mx-auto mb-8 max-w-xl">
              Join thousands of creators using AstraPost to grow their audience.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" className="group h-11 px-8" asChild>
                <Link href="/login">
                  Start Free Trial
                  <ArrowRight className="ms-2 h-4 w-4 transition-transform group-hover:translate-x-1 rtl:scale-x-[-1] rtl:group-hover:-translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-11 px-8" asChild>
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
