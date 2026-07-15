import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LogoMark } from "@/components/brand";
import { LanguageSwitcher } from "@/components/dashboard/language-switcher";
import { HeaderNav } from "@/components/header-nav";
import { MobileMenu } from "@/components/mobile-menu";
import { SiteHeaderAuth } from "@/components/site-header-auth";
import { ModeToggle } from "./ui/mode-toggle";

export async function SiteHeader() {
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
          <LanguageSwitcher />

          {/* Desktop auth — resolved client-side to keep the server render
              deterministic (no auth-driven hydration mismatch). */}
          <SiteHeaderAuth />

          {/* Mobile hamburger + panel — client component */}
          <MobileMenu />
        </div>
      </nav>
    </header>
  );
}
