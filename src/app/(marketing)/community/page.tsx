import Link from "next/link";
import { Users, MessagesSquare, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CommunityPage() {
  const stats = [
    { label: "Members", value: "2,500+" },
    { label: "Daily Posts", value: "1,200+" },
    { label: "Threads Created", value: "50,000+" },
  ];

  return (
    <div className="container mx-auto px-4 py-16 space-y-24">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Join the AstroPost Community</h1>
          <p className="text-xl text-muted-foreground">
            Connect with thousands of creators, share your wins, get feedback on your content, and grow together.
          </p>
          <div className="flex gap-4">
            <Button size="lg" asChild>
              <Link href="https://discord.gg/astropost">Join Discord</Link>
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

      <div className="bg-muted/30 rounded-3xl p-12 text-center max-w-4xl mx-auto space-y-8">
        <h2 className="text-3xl font-bold">Why Join?</h2>
        <div className="grid md:grid-cols-3 gap-8 text-left">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Weekly Challenges</h3>
            <p className="text-muted-foreground text-sm">Participate in content challenges and win prizes.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Feedback Loops</h3>
            <p className="text-muted-foreground text-sm">Get honest feedback on your threads before posting.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Exclusive AMAs</h3>
            <p className="text-muted-foreground text-sm">Chat with top creators and the AstroPost team.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
