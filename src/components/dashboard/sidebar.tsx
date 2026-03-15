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
  Bot,
  Lightbulb,
  ShoppingCart,
  Settings,
  LogOut,
  Rocket,
  Menu,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface SidebarSection {
  label: string;
  items: { icon: React.ComponentType<{ className?: string }>; label: string; href: string }[];
}

const sidebarSections: SidebarSection[] = [
  {
    label: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    label: "Content",
    items: [
      { icon: PenSquare, label: "Compose", href: "/dashboard/compose" },
      { icon: ListOrdered, label: "Queue", href: "/dashboard/queue" },
      { icon: CalendarDays, label: "Calendar", href: "/dashboard/calendar" },
      { icon: FileText, label: "Drafts", href: "/dashboard/drafts" },
    ],
  },
  {
    label: "AI Tools",
    items: [
      { icon: Bot, label: "AI Writer", href: "/dashboard/ai" },
      { icon: Lightbulb, label: "Inspiration", href: "/dashboard/inspiration" },
      { icon: ShoppingCart, label: "Affiliate", href: "/dashboard/affiliate" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { icon: BarChart2, label: "Analytics", href: "/dashboard/analytics" },
      { icon: TrendingUp, label: "Viral Analyzer", href: "/dashboard/analytics/viral" },
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

interface SidebarContentProps {
  pathname: string;
  onNavigate?: () => void;
}

function SidebarContent({ pathname, onNavigate }: SidebarContentProps) {
  const [aiUsage, setAiUsage] = useState<{
    used: number;
    limit: number | null;
    resetDate: string;
  } | null>(null);

  useEffect(() => {
    const loadUsage = async () => {
      try {
        const res = await fetch("/api/user/ai-usage", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setAiUsage(data);
      } catch {
        // Silently fail — sidebar should not break if AI usage endpoint is down
      }
    };

    void loadUsage();
  }, []);

  const aiProgress =
    aiUsage && typeof aiUsage.limit === "number" && aiUsage.limit > 0
      ? Math.min(100, Math.round((aiUsage.used / aiUsage.limit) * 100))
      : 0;

  const aiProgressLabel =
    aiUsage && aiUsage.limit === null ? "Unlimited" : `${aiProgress}%`;

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6">
        <Rocket className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold tracking-tight">AstraPost</span>
      </div>

      {/* Navigation sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Dashboard navigation">
        {sidebarSections.map((section, idx) => (
          <div key={section.label} className={cn(idx > 0 && "mt-6")}>
            {/* Section label — skip for first section (Overview/Dashboard) */}
            {idx > 0 && (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => onNavigate?.()}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4.5 w-4.5 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* External link — Roadmap */}
        <div className="mt-6">
          <Link
            href="/roadmap"
            onClick={() => onNavigate?.()}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="h-4.5 w-4.5 shrink-0" />
            <span>Roadmap</span>
          </Link>
        </div>
      </nav>

      {/* Bottom: AI credits + sign out */}
      <div className="shrink-0 space-y-3 border-t border-border p-4">
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          {aiUsage ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">AI Credits</span>
                <span className="text-xs text-muted-foreground">{aiProgressLabel}</span>
              </div>
              <Progress value={aiProgress} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                {typeof aiUsage.limit === "number"
                  ? `${aiUsage.used}/${aiUsage.limit} used this month`
                  : `${aiUsage.used} used this month`}
              </p>
            </>
          ) : (
            /* Skeleton loading state — matches exact layout dimensions */
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
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={() => signOut({
            fetchOptions: {
              onSuccess: () => {
                window.location.href = "/login";
              },
            },
          })}
        >
          <LogOut className="mr-2 h-4.5 w-4.5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:sticky md:top-0 md:h-dvh md:w-64 md:shrink-0 flex-col bg-card border-r border-border">
        <SidebarContent pathname={pathname} />
      </div>

      {/* Mobile Sidebar Trigger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm border shadow-sm">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent pathname={pathname} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
