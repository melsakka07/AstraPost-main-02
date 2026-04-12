"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  Bot,
  CreditCard,
  FileText,
  Gift,
  HeartPulse,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Megaphone,
  ShieldCheck,
  Tag,
  ToggleLeft,
  TrendingUp,
  Users,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { AdminSidebarContent } from "./sidebar-content";

const sidebarSections = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/health", label: "System Health", icon: HeartPulse },
    ],
  },
  {
    label: "Users",
    items: [
      { href: "/admin/subscribers", label: "Subscribers", icon: Users },
      { href: "/admin/ai-usage", label: "AI Usage", icon: Bot },
      { href: "/admin/teams", label: "Teams", icon: Users },
      { href: "/admin/impersonation", label: "Impersonation", icon: ShieldCheck },
    ],
  },
  {
    label: "Billing",
    items: [
      { href: "/admin/billing", label: "Billing Overview", icon: CreditCard },
      { href: "/admin/billing/analytics", label: "Analytics", icon: TrendingUp },
      { href: "/admin/billing/promo-codes", label: "Promo Codes", icon: Tag },
    ],
  },
  {
    label: "Product",
    items: [
      { href: "/admin/content", label: "Content Performance", icon: FileText },
      { href: "/admin/referrals", label: "Referrals", icon: UserPlus },
      { href: "/admin/agentic", label: "Agentic Posts", icon: Bot },
      { href: "/admin/affiliate", label: "Affiliate", icon: Gift },
      { href: "/admin/announcement", label: "Announcement", icon: Megaphone },
      { href: "/admin/roadmap", label: "Roadmap", icon: Lightbulb },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/audit", label: "Audit Log", icon: FileText },
      { href: "/admin/feature-flags", label: "Feature Flags", icon: ToggleLeft },
      { href: "/admin/jobs", label: "Jobs (BullMQ)", icon: Activity },
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Initialize from localStorage after hydration
  useEffect(() => {
    const saved = localStorage.getItem("admin-sidebar-collapsed");
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(JSON.parse(saved));
    }
    setHydrated(true);
  }, []);

  // Persist collapsed state to localStorage
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem("admin-sidebar-collapsed", JSON.stringify(collapsed));
    }
  }, [collapsed, hydrated]);

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={cn(
          "bg-muted/30 fixed top-0 bottom-0 left-0 flex h-dvh flex-col border-r transition-all duration-300",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <ShieldCheck className="text-primary h-6 w-6 shrink-0" />
            {!collapsed && <span className="text-lg font-semibold">Admin</span>}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hover:bg-muted ml-auto hidden rounded-lg p-1 md:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        <AdminSidebarContent sections={sidebarSections} collapsed={collapsed} pathname={pathname} />

        <div className="mt-auto border-t p-3">
          <Link href="/dashboard">
            <Button
              variant="outline"
              size="sm"
              className={cn(collapsed && "w-full justify-center")}
            >
              {collapsed ? (
                <LayoutDashboard className="h-4 w-4" />
              ) : (
                <>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Back to App
                </>
              )}
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile Menu Button & Drawer - only render after hydration to avoid ID mismatch */}
      {hydrated && (
        <div className="fixed top-4 left-4 z-50 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-11 w-11">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open admin menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 max-w-[calc(100vw-2rem)] p-0">
              <div className="flex h-14 items-center border-b px-4">
                <Link href="/admin" className="flex items-center gap-2">
                  <ShieldCheck className="text-primary h-6 w-6" />
                  <span className="text-lg font-semibold">Admin</span>
                </Link>
              </div>
              <AdminSidebarContent
                sections={sidebarSections}
                collapsed={false}
                pathname={pathname}
              />
              <div className="mt-auto border-t p-3">
                <Link href="/dashboard">
                  <Button variant="outline" className="w-full justify-start">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Back to App
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </>
  );
}
