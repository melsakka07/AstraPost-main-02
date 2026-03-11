import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { FeedbackList } from "@/components/roadmap/feedback-list";

export const metadata = {
  title: "Public Roadmap | AstroPost",
  description: "Help shape the future of AstroPost. Submit ideas and vote on features.",
};

export default async function RoadmapPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

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
      <main className="flex-1 container mx-auto py-12 px-4 md:px-6 max-w-5xl">
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Public Roadmap</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We're building AstroPost in public. Submit your ideas, report bugs, and vote on what we should build next.
          </p>
        </div>
        
        <FeedbackList isLoggedIn={!!session} />
      </main>
    </div>
  );
}
