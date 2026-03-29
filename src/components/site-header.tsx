import { headers } from "next/headers";
import Link from "next/link";
import { Rocket } from "lucide-react";
import { UserProfile } from "@/components/auth/user-profile";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { HeaderNav } from "@/components/header-nav";
import { MobileMenu } from "@/components/mobile-menu";
import { auth } from "@/lib/auth";
import { Button } from "./ui/button";
import { ModeToggle } from "./ui/mode-toggle";

export async function SiteHeader() {
  const session = await auth.api.getSession({ headers: await headers() });
  const isAuthenticated = !!session;

  return (
    <header data-site-header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav
        className="container mx-auto flex items-center justify-between px-4 py-3"
        aria-label="Main navigation"
      >
        {/* Left: logo + desktop nav */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl"
            aria-label="AstraPost - Go to homepage"
          >
            <Rocket className="h-6 w-6 text-primary" />
            <span>AstraPost</span>
          </Link>

          {/* Desktop nav — client component (needs usePathname for active state) */}
          <HeaderNav />
        </div>

        {/* Right: theme toggle + desktop auth + mobile hamburger */}
        <div className="flex items-center gap-3">
          <ModeToggle />

          {/* Desktop auth — hidden on mobile */}
          {isAuthenticated ? (
            <div className="hidden md:flex items-center gap-3">
              <NotificationBell />
              <Button variant="ghost" asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <UserProfile user={session.user} />
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/login">Get Started</Link>
              </Button>
            </div>
          )}

          {/* Mobile hamburger + panel — client component */}
          <MobileMenu isAuthenticated={isAuthenticated} />
        </div>
      </nav>
    </header>
  );
}
