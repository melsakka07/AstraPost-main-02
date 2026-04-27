import { headers } from "next/headers";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { UserProfile } from "@/components/auth/user-profile";
import { LogoMark } from "@/components/brand";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { HeaderNav } from "@/components/header-nav";
import { MobileMenu } from "@/components/mobile-menu";
import { auth } from "@/lib/auth";
import { Button } from "./ui/button";
import { ModeToggle } from "./ui/mode-toggle";

export async function SiteHeader() {
  const session = await auth.api.getSession({ headers: await headers() });
  const isAuthenticated = !!session;
  const t = await getTranslations("nav");
  const tFooter = await getTranslations("site_footer");

  return (
    <header
      data-site-header
      className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b backdrop-blur"
    >
      <nav
        className="container mx-auto flex items-center justify-between px-4 py-3"
        aria-label={t("main_navigation")}
      >
        {/* Left: logo + desktop nav */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold"
            aria-label={tFooter("logo_alt")}
          >
            <LogoMark size={24} className="text-primary" />
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
            <div className="hidden items-center gap-3 md:flex">
              <NotificationBell />
              <Button variant="ghost" asChild>
                <Link href="/dashboard">{t("dashboard")}</Link>
              </Button>
              <UserProfile user={session.user} />
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" asChild>
                <Link href="/login">{t("sign_in")}</Link>
              </Button>
              <Button asChild>
                <Link href="/login">{t("get_started")}</Link>
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
