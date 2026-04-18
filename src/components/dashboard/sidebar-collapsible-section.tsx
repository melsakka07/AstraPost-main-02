"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { isItemActive } from "@/components/dashboard/sidebar-active-state";
import type { NavItem, SidebarSection } from "@/components/dashboard/sidebar-nav-data";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  section: SidebarSection;
  pathname: string;
  allNavItems: NavItem[];
  onNavigate?: () => void;
  isMobile: boolean;
  userPlan?: string;
  t?: (key: string, options?: { defaultValue?: string }) => string;
}

export function CollapsibleSection({
  section,
  pathname,
  allNavItems,
  onNavigate,
  isMobile,
  userPlan = "free",
  t,
}: CollapsibleSectionProps) {
  const hasActiveChild = section.items.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  // On mobile, start collapsed unless a child is active (M2).
  // On desktop, always expanded (collapsible prop is ignored).
  // vaul Drawer unmounts content on close, so this initializer re-runs fresh
  // every time the Drawer is opened — no useEffect sync needed.
  const [isOpen, setIsOpen] = useState(!isMobile || hasActiveChild);

  const linkPy = isMobile ? "py-3" : "py-2.5"; // M3

  return (
    <div>
      {/* Collapsible header — only interactive on mobile */}
      <button
        type="button"
        onClick={() => isMobile && setIsOpen((v) => !v)}
        className={cn(
          "text-muted-foreground/60 flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase transition-colors",
          isMobile && "hover:text-muted-foreground cursor-pointer"
        )}
        {...(isMobile
          ? {
              "aria-expanded": isOpen,
              "aria-controls": `section-${section.label}`,
            }
          : {})}
        // Prevent keyboard interaction on desktop where the button is decorative
        tabIndex={isMobile ? 0 : -1}
      >
        {t
          ? t(section.label.toLowerCase().replace(/\s+/g, "_"), { defaultValue: section.label })
          : section.label}
        {isMobile && (
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
            aria-hidden="true"
          />
        )}
      </button>

      <div
        id={isMobile ? `section-${section.label}` : undefined}
        className={cn(
          "space-y-0.5 overflow-hidden transition-all duration-200",
          isMobile && !isOpen ? "max-h-0 opacity-0" : "max-h-[600px] opacity-100"
        )}
      >
        {section.items.map((item) => {
          const isActive = isItemActive(item.href, pathname, allNavItems);
          const itemLabelKey = item.label.toLowerCase().replace(/\s+/g, "_");
          const translatedItemLabel = t
            ? t(itemLabelKey, { defaultValue: item.label })
            : item.label;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onNavigate?.()}
              aria-current={isActive ? "page" : undefined}
              data-tour={item.dataTour}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                linkPy,
                isActive
                  ? isMobile
                    ? "bg-primary/15 text-primary font-semibold" // M6
                    : "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {translatedItemLabel}
              {item.isNew && (
                <Badge className="ms-auto h-4 border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0 text-[10px] text-emerald-600">
                  New
                </Badge>
              )}
              {item.isPro &&
                !item.isNew &&
                (userPlan === "free" ? (
                  <Link href="/pricing" onClick={(e) => e.stopPropagation()} className="ms-auto">
                    <Badge
                      variant="outline"
                      className="border-primary/30 text-primary hover:bg-primary/10 h-4 cursor-pointer px-1.5 py-0 text-[10px]"
                    >
                      Pro
                    </Badge>
                  </Link>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-primary/30 text-primary ms-auto h-4 px-1.5 py-0 text-[10px]"
                  >
                    Pro
                  </Badge>
                ))}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
