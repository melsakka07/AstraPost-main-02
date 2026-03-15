import Link from "next/link";
import { Users, MessagesSquare, Trophy, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community",
  description:
    "Connect with thousands of creators, share your wins, get feedback on your content, and grow together.",
  alternates: { canonical: "/community" },
  openGraph: {
    title: "Community — AstraPost",
    description:
      "Connect with thousands of creators, share your wins, get feedback on your content, and grow together.",
    url: "/community",
  },
};

export default function CommunityPage() {
  const stats = [
    { label: "Members", value: "2,500+" },
    { label: "Daily Posts", value: "1,200+" },
    { label: "Threads Created", value: "50,000+" },
  ];

  const benefits = [
    {
      icon: <MessagesSquare className="h-6 w-6" />,
      title: "Weekly Challenges",
      description: "Participate in content challenges and win prizes."
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Feedback Loops",
      description: "Get honest feedback on your threads before posting."
    },
    {
      icon: <Trophy className="h-6 w-6" />,
      title: "Exclusive AMAs",
      description: "Chat with top creators and the AstraPost team."
    }
  ];

  return (
    <div className="relative min-h-screen">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 space-y-24">
        {/* Hero */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <Badge variant="outline">Community</Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Join the AstraPost Community
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Connect with thousands of creators, share your wins, get feedback on your content, and grow together.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="group" asChild>
                <Link href="https://discord.gg/astropost">
                  Join Discord
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="https://twitter.com/astropost">Follow on X</Link>
              </Button>
            </div>
          </div>
          <div className="relative aspect-square md:aspect-auto rounded-2xl bg-gradient-to-tr from-primary/20 via-background to-background p-8 border shadow-lg flex items-center justify-center">
            <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
            <div className="relative z-10 text-center space-y-8">
              <div className="flex justify-center gap-8">
                 <div className="flex flex-col items-center p-4 bg-background rounded-lg shadow-sm border">
                   <Users className="h-8 w-8 text-primary mb-2" />
                   <span className="text-2xl font-bold">{stats[0]!.value}</span>
                   <span className="text-sm text-muted-foreground">{stats[0]!.label}</span>
                 </div>
                 <div className="flex flex-col items-center p-4 bg-background rounded-lg shadow-sm border">
                   <MessagesSquare className="h-8 w-8 text-primary mb-2" />
                   <span className="text-2xl font-bold">{stats[1]!.value}</span>
                   <span className="text-sm text-muted-foreground">{stats[1]!.label}</span>
                 </div>
              </div>
              <div className="flex justify-center">
                 <div className="flex flex-col items-center p-4 bg-background rounded-lg shadow-sm border w-full max-w-[200px]">
                   <Trophy className="h-8 w-8 text-primary mb-2" />
                   <span className="text-2xl font-bold">{stats[2]!.value}</span>
                   <span className="text-sm text-muted-foreground">{stats[2]!.label}</span>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-muted/30 rounded-3xl p-12 text-center max-w-4xl mx-auto space-y-8">
          <h2 className="text-3xl font-bold">Why Join?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-left space-y-3">
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  {benefit.icon}
                </div>
                <h3 className="font-semibold text-lg">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-muted/50 to-muted/20 p-8 md:p-12 text-center max-w-4xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5" />
          <div className="relative">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">Ready to join?</h3>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">
              Get instant access to our community of creators and start growing your audience today.
            </p>
            <Button size="lg" className="group" asChild>
              <Link href="https://discord.gg/astropost">
                Join Community Now
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
