"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, LayoutDashboard, ListOrdered, Menu, PenSquare, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const BOTTOM_NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: PenSquare, label: "Compose", href: "/dashboard/compose" },
  { icon: ListOrdered, label: "Queue", href: "/dashboard/queue" },
  { icon: Bot, label: "AI", href: "/dashboard/ai" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
] as const;

/**
 * M1 — Sticky bottom navigation bar visible only on mobile (< md).
 * Shows 5 primary navigation items: Dashboard, Compose, Queue, AI, Settings.
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
      className="bg-background/95 supports-[backdrop-filter]:bg-background/60 fixed right-0 bottom-0 left-0 z-50 border-t pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-sm md:hidden"
      aria-label={tMobileNav("mobile_navigation")}
      // Safe area inset keeps nav items above the device home indicator
    >
      <div className="flex h-14 items-stretch">
        {BOTTOM_NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          // Mark the item active if on its route or any child route.
          // Special handling: /dashboard/ai matches /dashboard/ai and /dashboard/ai/...
          // but not /dashboard/ai-related paths (e.g., /dashboard/analytics is not under /dashboard/ai)
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          const translatedLabel = t(label.toLowerCase() as any, { defaultValue: label });

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              aria-label={translatedLabel}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {translatedLabel}
            </Link>
          );
        })}

        {/* "More" — opens the full sidebar Sheet via custom event.
            Routes accessible through More: Drafts, Calendar, Analytics, Viral Analyzer,
            Competitor, Achievements, Referrals, Jobs (admin), plus all collapsible sections. */}
        <button
          type="button"
          aria-label={tShell("open_navigation")}
          className="text-muted-foreground hover:text-foreground flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors"
          onClick={() => document.dispatchEvent(new CustomEvent("sidebar:open"))}
        >
          <Menu className="h-5 w-5 shrink-0" />
          {tShell("bottom_nav.more")}
        </button>
      </div>
    </nav>
  );
}
