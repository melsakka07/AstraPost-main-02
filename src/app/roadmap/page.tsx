import { headers } from "next/headers";
import { FeedbackList } from "@/components/roadmap/feedback-list";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";

export const metadata = {
  title: "Public Roadmap | AstraPost",
  description: "Help shape the future of AstraPost. Submit ideas and vote on features.",
};

export default async function RoadmapPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <div className="relative min-h-screen">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 max-w-5xl space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <Badge variant="outline" className="px-4 py-1">Roadmap</Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            Public Roadmap
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            We're building AstraPost in public. Submit your ideas, report bugs, and vote on what we should build next.
          </p>
        </div>

        {/* Feedback List */}
        <FeedbackList isLoggedIn={!!session} />

        {/* Info Card */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-muted/50 to-muted/20 p-8 text-center">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5" />
          <div className="relative">
            <h3 className="text-xl font-bold mb-2">
              Want to influence our roadmap?
            </h3>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Join our community to discuss features and vote on upcoming priorities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
