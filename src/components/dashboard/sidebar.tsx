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
  CalendarDays,
  ListChecks,
  Bot,
  ShoppingCart,
  Settings,
  LogOut,
  Rocket,
  Menu,
  Map
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: PenSquare, label: "Compose", href: "/dashboard/compose" },
  { icon: ListOrdered, label: "Queue", href: "/dashboard/queue" },
  { icon: CalendarDays, label: "Calendar", href: "/dashboard/calendar" },
  { icon: FileText, label: "Drafts", href: "/dashboard/drafts" },
  { icon: BarChart2, label: "Analytics", href: "/dashboard/analytics" },
  { icon: ListChecks, label: "Jobs", href: "/dashboard/jobs" },
  { icon: Bot, label: "AI Writer", href: "/dashboard/ai" },
  { icon: ShoppingCart, label: "Affiliate", href: "/dashboard/affiliate" },
  { icon: Map, label: "Roadmap", href: "/roadmap" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
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
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        setAiUsage(data);
      } catch {
      }
    };

    void loadUsage();
  }, []);

  const aiProgress =
    aiUsage && typeof aiUsage.limit === "number" && aiUsage.limit > 0
      ? Math.min(100, Math.round((aiUsage.used / aiUsage.limit) * 100))
      : 0;

  const aiUsageLabel =
    aiUsage && typeof aiUsage.limit === "number"
      ? `${aiUsage.used}/${aiUsage.limit} used this month`
      : aiUsage
      ? `${aiUsage.used} used this month`
      : "Loading...";

  const aiProgressLabel =
    aiUsage && aiUsage.limit === null ? "Unlimited" : `${aiProgress}%`;

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 flex items-center gap-2 border-b border-border h-16">
        <Rocket className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold">AstroPost</span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-4">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onNavigate?.()}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4 p-4 border-t border-border">
        <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">AI Credits</span>
            <span className="text-xs text-muted-foreground">{aiProgressLabel}</span>
          </div>
          <Progress value={aiProgress} className="h-1.5" />
          <p className="text-xs text-muted-foreground">{aiUsageLabel}</p>
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
          <LogOut className="mr-2 h-5 w-5" />
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
      <div className="hidden md:flex md:sticky md:top-16 md:h-[calc(100dvh-4rem)] md:w-64 md:shrink-0 flex-col bg-card border-r border-border">
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
