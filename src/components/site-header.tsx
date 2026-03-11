import { headers } from "next/headers";
import Link from "next/link";
import { Rocket } from "lucide-react";
import { UserProfile } from "@/components/auth/user-profile";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { auth } from "@/lib/auth";
import { Button } from "./ui/button";
import { ModeToggle } from "./ui/mode-toggle";

export async function SiteHeader() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <nav
        className="container mx-auto px-4 py-3 flex justify-between items-center"
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-xl"
              aria-label="AstroPost - Go to homepage"
            >
              <Rocket className="h-6 w-6 text-primary" />
              <span>AstroPost</span>
            </Link>

            <div className="hidden md:flex gap-6 text-sm font-medium">
                <Link href="/features" className="text-muted-foreground hover:text-foreground transition-colors">Features</Link>
                <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
                <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
            </div>
        </div>

        <div className="flex items-center gap-4">
          <ModeToggle />
          {session ? (
              <div className="flex items-center gap-4">
                  <NotificationBell />
                  <Button variant="ghost" asChild>
                      <Link href="/dashboard">Dashboard</Link>
                  </Button>
                  <UserProfile />
              </div>
          ) : (
              <div className="flex items-center gap-2">
                  <Button variant="ghost" asChild>
                      <Link href="/login">Sign In</Link>
                  </Button>
                  <Button asChild>
                      <Link href="/register">Get Started</Link>
                  </Button>
              </div>
          )}
        </div>
      </nav>
    </header>
  );
}
