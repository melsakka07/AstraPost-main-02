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
        <div className="from-primary/5 absolute top-0 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br via-purple-500/5 to-pink-500/5 blur-3xl" />
      </div>

      <div className="container mx-auto max-w-3xl space-y-12 px-4 py-16 md:py-24">
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <Badge variant="outline" className="px-4 py-1">
            Roadmap
          </Badge>
          <h1 className="from-foreground via-foreground to-foreground/70 bg-gradient-to-br bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-5xl">
            Product Roadmap
          </h1>
          <p className="text-muted-foreground mx-auto max-w-xl text-xl leading-relaxed">
            Help us build the features you need. Submit your ideas and suggestions below — our
            development team reviews every submission.
          </p>
        </div>

        <SubmissionForm isLoggedIn={!!session} />

        <div className="border-border/50 from-muted/50 to-muted/20 relative overflow-hidden rounded-2xl border bg-gradient-to-br p-8 text-center">
          <div className="from-primary/5 absolute inset-0 bg-gradient-to-r via-purple-500/5 to-pink-500/5" />
          <div className="relative space-y-3">
            <h3 className="text-lg font-semibold">We&apos;re always looking for ways to improve</h3>
            <p className="text-muted-foreground mx-auto max-w-md text-sm">
              Tell us what you&apos;d like to see next. Every submission helps shape the future of
              AstraPost.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
