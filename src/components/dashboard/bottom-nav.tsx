"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, ListOrdered, Menu, PenSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const BOTTOM_NAV_ITEMS = [
  { icon: PenSquare, label: "Compose", href: "/dashboard/compose" },
  { icon: ListOrdered, label: "Queue", href: "/dashboard/queue" },
  { icon: Bot, label: "AI Tools", href: "/dashboard/ai" },
] as const;

/**
 * M1 — Sticky bottom navigation bar visible only on mobile (< md).
 * "More" dispatches the same `sidebar:open` event as the hamburger button,
 * opening the full Sheet with all nav items.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60 md:hidden"
      aria-label="Mobile navigation"
      // Safe area inset keeps nav items above the device home indicator
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex h-14 items-stretch">
        {BOTTOM_NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          // Mark the item active if on its route or any child route,
          // but avoid matching /dashboard/ai/... for the Queue item etc.
          const isActive =
            pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              aria-label={label}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          );
        })}

        {/* "More" — opens the existing Sheet via the same custom event as the hamburger */}
        <button
          type="button"
          aria-label="Open full navigation menu"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          onClick={() =>
            document.dispatchEvent(new CustomEvent("sidebar:open"))
          }
        >
          <Menu className="h-5 w-5 shrink-0" />
          More
        </button>
      </div>
    </nav>
  );
}
