"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PenSquare,
  ListOrdered,
  FileText,
  BarChart2,
  TrendingUp,
  CalendarDays,
  ListChecks,
  Lightbulb,
  ShoppingCart,
  Settings,
  LogOut,
  Rocket,
  ExternalLink,
  Sparkles,
  Users,
  MessageCircle,
  CalendarRange,
  UserPen,
  History,
  Trophy,
  Share2,
  ChevronDown,
  Wand2,
} from "lucide-react";
import { Drawer as DrawerPrimitive } from "vaul";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "@/lib/auth-client";
import type { MonthlyAiUsage } from "@/lib/services/ai-quota";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  isPro?: boolean;
  isNew?: boolean;
}

interface SidebarSection {
  label: string;
  items: NavItem[];
  /** When true, the section collapses in the mobile Sheet */
  collapsible?: boolean;
}

// ── Navigation Rules ──────────────────────────────────────────────────────────
// 1. Every /dashboard/* route MUST have an entry here or be reachable from a
//    page that does. Never ship a dashboard page without a sidebar path.
// 2. This array is the single source of truth for navigation. If a page is
//    also linked from a hub/overview card, the hub must be the sidebar entry —
//    do NOT list both the hub and its sub-pages as peer siblings.
// 3. Hub pages (e.g. /dashboard/ai) are supplementary launchers. Their cards
//    must not duplicate links already present here at the same level.
// ─────────────────────────────────────────────────────────────────────────────
const sidebarSections: SidebarSection[] = [
  {
    label: "Overview",
    items: [{ icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" }],
  },
  {
    label: "Content",
    items: [
      { icon: PenSquare, label: "Compose", href: "/dashboard/compose" },
      { icon: FileText, label: "Drafts", href: "/dashboard/drafts" },
      { icon: ListOrdered, label: "Queue", href: "/dashboard/queue" },
      { icon: CalendarDays, label: "Calendar", href: "/dashboard/calendar" },
    ],
  },
  {
    label: "AI Tools",
    collapsible: true,
    items: [
      {
        icon: Wand2,
        label: "Agentic Posting",
        href: "/dashboard/ai/agentic",
        isPro: true,
        isNew: true,
      },
      { icon: Sparkles, label: "AI Tools", href: "/dashboard/ai" },
      {
        icon: CalendarRange,
        label: "Content Calendar",
        href: "/dashboard/ai/calendar",
        isPro: true,
      },
      { icon: MessageCircle, label: "Reply Suggester", href: "/dashboard/ai/reply", isPro: true },
      { icon: UserPen, label: "Bio Optimizer", href: "/dashboard/ai/bio", isPro: true },
      { icon: History, label: "AI History", href: "/dashboard/ai/history" },
      { icon: Lightbulb, label: "Inspiration", href: "/dashboard/inspiration" },
      { icon: ShoppingCart, label: "AI Affiliate", href: "/dashboard/affiliate" },
    ],
  },
  {
    label: "Analytics",
    collapsible: true,
    items: [
      { icon: BarChart2, label: "Analytics", href: "/dashboard/analytics" },
      { icon: TrendingUp, label: "Viral Analyzer", href: "/dashboard/analytics/viral" },
      { icon: Users, label: "Competitor", href: "/dashboard/analytics/competitor", isPro: true },
    ],
  },
  {
    label: "Growth",
    items: [
      { icon: Trophy, label: "Achievements", href: "/dashboard/achievements" },
      { icon: Share2, label: "Referrals", href: "/dashboard/referrals" },
    ],
  },
  {
    label: "System",
    items: [
      { icon: ListChecks, label: "Jobs", href: "/dashboard/jobs" },
      { icon: Settings, label: "Settings", href: "/dashboard/settings" },
    ],
  },
];

// ── CollapsibleSection ────────────────────────────────────────────────────────
// Wraps a nav section in a toggle for the mobile Sheet (M2).
// Default open when any child matches the current pathname.
interface CollapsibleSectionProps {
  section: SidebarSection;
  pathname: string;
  onNavigate?: () => void;
  isMobile: boolean;
}

function CollapsibleSection({ section, pathname, onNavigate, isMobile }: CollapsibleSectionProps) {
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
        {section.label}
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
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onNavigate?.()}
              aria-current={isActive ? "page" : undefined}
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
              {item.label}
              {item.isNew && (
                <Badge className="ms-auto h-4 border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0 text-[10px] text-emerald-600">
                  New
                </Badge>
              )}
              {item.isPro && !item.isNew && (
                <Badge
                  variant="outline"
                  className="border-primary/30 text-primary ms-auto h-4 px-1.5 py-0 text-[10px]"
                >
                  Pro
                </Badge>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── SidebarContent ────────────────────────────────────────────────────────────

interface SidebarContentProps {
  pathname: string;
  onNavigate?: () => void;
  aiUsage: MonthlyAiUsage | null;
  /** True when rendered inside the mobile Drawer — enables M2/M3/M6/M7 behaviour */
  isMobile?: boolean;
  /** M7 — user info shown in mobile drawer header */
  user?: { name: string; image: string | null };
}

function SidebarContent({
  pathname,
  onNavigate,
  aiUsage,
  isMobile = false,
  user,
  referralsEnabled = true,
}: SidebarContentProps & { referralsEnabled?: boolean }) {
  const aiProgress =
    aiUsage && typeof aiUsage.limit === "number" && aiUsage.limit > 0
      ? Math.min(100, Math.round((aiUsage.used / aiUsage.limit) * 100))
      : 0;

  const aiProgressLabel = aiUsage && aiUsage.limit === null ? "Unlimited" : `${aiProgress}%`;

  const linkPy = isMobile ? "py-3" : "py-2.5"; // M3

  const handleSignOut = () =>
    signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });

  // Filter sidebar sections based on feature flags
  const filteredSections = sidebarSections
    .map((section) => {
      if (section.label === "Growth" && !referralsEnabled) {
        return {
          ...section,
          items: section.items.filter((item) => item.label !== "Referrals"),
        };
      }
      return section;
    })
    .filter((section) => section.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      {/* M7 — user avatar + quick sign-out in mobile Drawer header */}
      {isMobile && user && (
        <div className="border-border flex items-center gap-3 border-b px-4 py-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={user.image ?? undefined} alt={user.name} />
            <AvatarFallback className="text-xs">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="flex-1 truncate text-sm font-medium">{user.name}</span>
          <button
            type="button"
            aria-label="Sign out"
            className="text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Brand */}
      <Link
        href="/"
        className="border-border flex h-16 shrink-0 items-center gap-2 border-b px-6 transition-opacity hover:opacity-80"
        aria-label="Go to AstraPost home"
      >
        <Rocket className="text-primary h-6 w-6" />
        <span className="text-xl font-bold tracking-tight">AstraPost</span>
      </Link>

      {/* Navigation sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Dashboard navigation">
        {filteredSections.map((section, idx) => (
          <div key={section.label} className={cn(idx > 0 && "mt-6")}>
            {idx === 0 ? (
              // Overview — no label, always visible, no collapse
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => onNavigate?.()}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                        linkPy,
                        isActive
                          ? isMobile
                            ? "bg-primary/15 text-primary font-semibold"
                            : "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4.5 w-4.5 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ) : section.collapsible ? (
              // M2 — collapsible on mobile, always expanded on desktop
              <CollapsibleSection
                section={section}
                pathname={pathname}
                {...(onNavigate !== undefined && { onNavigate })}
                isMobile={isMobile}
              />
            ) : (
              // Regular section with label — always expanded
              <>
                <p className="text-muted-foreground/60 mb-1.5 px-3 text-[11px] font-semibold tracking-wider uppercase">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => onNavigate?.()}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                          linkPy,
                          isActive
                            ? isMobile
                              ? "bg-primary/15 text-primary font-semibold"
                              : "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-4.5 w-4.5 shrink-0" />
                        {item.label}
                        {item.isPro && (
                          <Badge
                            variant="outline"
                            className="border-primary/30 text-primary ms-auto h-4 px-1.5 py-0 text-[10px]"
                          >
                            Pro
                          </Badge>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ))}

        {/* External link — Roadmap */}
        <div className="mt-6">
          <Link
            href="/roadmap"
            onClick={() => onNavigate?.()}
            className={cn(
              "text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              linkPy
            )}
          >
            <ExternalLink className="h-4.5 w-4.5 shrink-0" />
            <span>Roadmap</span>
          </Link>
        </div>
      </nav>

      {/* Bottom: AI credits + sign out */}
      <div className="border-border shrink-0 space-y-3 border-t p-4">
        <div className="border-border bg-muted/30 space-y-2 rounded-lg border p-3">
          {aiUsage ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-foreground text-xs font-medium">AI Credits</span>
                <span className="text-muted-foreground text-xs">{aiProgressLabel}</span>
              </div>
              <Progress value={aiProgress} className="h-1.5" />
              <p className="text-muted-foreground text-xs">
                {typeof aiUsage.limit === "number"
                  ? `${aiUsage.used}/${aiUsage.limit} used this month`
                  : `${aiUsage.used} used this month`}
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-3.5 w-8" />
              </div>
              <Skeleton className="h-1.5 w-full" />
              <Skeleton className="h-3 w-28" />
            </>
          )}
        </div>
        {/* Desktop-only sign-out button (mobile has quick-sign-out in drawer header M7) */}
        {!isMobile && (
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-destructive w-full justify-start"
            onClick={handleSignOut}
          >
            <LogOut className="me-2 h-4.5 w-4.5" />
            Sign Out
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  aiUsage: MonthlyAiUsage | null;
  /** M7 — user info for mobile Drawer header */
  user?: { name: string; image: string | null };
  referralsEnabled?: boolean;
}

export function Sidebar({ aiUsage, user, referralsEnabled = true }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [sheetSide, setSheetSide] = useState<"left" | "right">("left");

  useEffect(() => {
    const syncDir = () => {
      setSheetSide(document.documentElement.dir === "rtl" ? "right" : "left");
    };
    const observer = new MutationObserver(syncDir);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["dir"],
    });
    syncDir();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    document.addEventListener("sidebar:open", handleOpen);
    return () => document.removeEventListener("sidebar:open", handleOpen);
  }, []);

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="bg-card border-border hidden flex-col border-r md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:shrink-0">
        <SidebarContent
          pathname={pathname}
          aiUsage={aiUsage}
          isMobile={false}
          referralsEnabled={referralsEnabled}
        />
      </div>

      {/* Mobile Sidebar Drawer (vaul) — M4 swipe-to-close, M7 user header */}
      <DrawerPrimitive.Root open={open} onOpenChange={setOpen} direction={sheetSide}>
        <DrawerPrimitive.Portal>
          <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <DrawerPrimitive.Content
            className={cn(
              "bg-card fixed top-0 z-50 h-full w-64 overflow-auto outline-none",
              sheetSide === "left"
                ? "border-border left-0 border-r"
                : "border-border right-0 border-l"
            )}
          >
            <DrawerPrimitive.Title className="sr-only">Navigation menu</DrawerPrimitive.Title>
            <DrawerPrimitive.Description className="sr-only">
              Main navigation links
            </DrawerPrimitive.Description>
            <SidebarContent
              pathname={pathname}
              onNavigate={() => setOpen(false)}
              aiUsage={aiUsage}
              isMobile={true}
              referralsEnabled={referralsEnabled}
              {...(user !== undefined && { user })}
            />
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Portal>
      </DrawerPrimitive.Root>
    </>
  );
}
