import { headers } from "next/headers";
import { SubmissionForm } from "@/components/roadmap/submission-form";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";

export const metadata = {
  title: "Product Roadmap | AstraPost",
  description: "Help us build the features you need. Submit your ideas and suggestions.",
};

export default async function RoadmapPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <div className="relative min-h-dvh">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 max-w-3xl space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-6">
          <Badge variant="outline" className="px-4 py-1">Roadmap</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            Product Roadmap
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Help us build the features you need. Submit your ideas and suggestions below — our development team reviews every submission.
          </p>
        </div>

        <SubmissionForm isLoggedIn={!!session} />

        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-muted/50 to-muted/20 p-8 text-center">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5" />
          <div className="relative space-y-3">
            <h3 className="text-lg font-semibold">
              We&apos;re always looking for ways to improve
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              Tell us what you&apos;d like to see next. Every submission helps shape the future of AstraPost.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}