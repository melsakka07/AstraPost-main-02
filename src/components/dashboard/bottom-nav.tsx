"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, CalendarDays, LayoutDashboard, Menu, PenSquare, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { isItemActive } from "@/components/dashboard/sidebar-active-state";
import { ALL_NAV_ITEMS } from "@/components/dashboard/sidebar-nav-data";
import { cn } from "@/lib/utils";

const BOTTOM_NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: PenSquare, label: "Compose", href: "/dashboard/compose" },
  { icon: CalendarDays, label: "Schedule", href: "/dashboard/schedule" },
  { icon: Bot, label: "AI", href: "/dashboard/ai" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
] as const;

/**
 * M1 — Sticky bottom navigation bar visible only on mobile (< md).
 * Shows 5 primary navigation items: Dashboard, Compose, Schedule, AI, Settings.
 * Additional routes accessible via "More" button which dispatches the `sidebar:open` event,
 * opening the full Sheet with all navigation items.
 *
 * This ensures parity with the sidebar while keeping 5 critical routes quickly accessible.
 */
export function BottomNav() {
  const t = useTranslations("nav");
  const tShell = useTranslations("dashboard_shell");
  const tMobileNav = useTranslations("mobile_nav");
  const pathname = usePathname();

  return (
    <nav
      className="bg-background/95 supports-[backdrop-filter]:bg-background/60 fixed start-0 end-0 bottom-0 z-50 border-t pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-sm md:hidden"
      aria-label={tMobileNav("mobile_navigation")}
      // Safe area inset keeps nav items above the device home indicator
    >
      <div className="flex h-14 items-stretch">
        {BOTTOM_NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          // Use the shared most-specific-match helper so a parent route (e.g. the
          // Dashboard root "/dashboard") is NOT highlighted on child pages like
          // "/dashboard/compose". Passing the full nav list lets "More" routes
          // (analytics, drafts, …) suppress the Dashboard fallback too.
          const isActive = isItemActive(href, pathname, ALL_NAV_ITEMS);
          const labelKey = label.toLowerCase();
          const translatedLabel = t.has(labelKey as any) ? t(labelKey as any) : label;

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              aria-label={translatedLabel}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {translatedLabel}
            </Link>
          );
        })}

        {/* "More" — opens the full sidebar Sheet via custom event.
            Routes accessible through More: Drafts, Analytics, Inspiration,
            Agentic Posting, Achievements, Referrals, Affiliate Dashboard, Jobs (admin), plus all collapsible sections. */}
        <button
          type="button"
          aria-label={tShell("open_navigation")}
          className="text-muted-foreground hover:text-foreground flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors"
          onClick={(e) => {
            // Drop focus before the drawer marks this nav aria-hidden — a focused
            // element inside an aria-hidden subtree triggers a WAI-ARIA violation.
            // Mirrors the dashboard header menu button (dashboard-header.tsx).
            (e.currentTarget as HTMLButtonElement).blur();
            document.dispatchEvent(new CustomEvent("sidebar:open"));
          }}
        >
          <Menu className="h-5 w-5 shrink-0" />
          {tShell("bottom_nav.more")}
        </button>
      </div>
    </nav>
  );
}
