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
  Trash2,
  TrendingUp,
  Users,
  UserPlus,
  Webhook,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { AdminSidebarContent } from "./sidebar-content";

export function AdminSidebar() {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const sidebarSections = [
    {
      label: t("nav.overview"),
      items: [
        { href: "/admin", label: t("nav.dashboard"), icon: LayoutDashboard },
        { href: "/admin/health", label: t("nav.system_health"), icon: HeartPulse },
      ],
    },
    {
      label: t("nav.users"),
      items: [
        { href: "/admin/subscribers", label: t("nav.subscribers"), icon: Users },
        { href: "/admin/ai-usage", label: t("nav.ai_usage"), icon: Bot },
        { href: "/admin/teams", label: t("nav.teams"), icon: Users },
        { href: "/admin/impersonation", label: t("nav.impersonation"), icon: ShieldCheck },
      ],
    },
    {
      label: t("nav.billing"),
      items: [
        { href: "/admin/billing", label: t("nav.billing_overview"), icon: CreditCard },
        { href: "/admin/billing/analytics", label: t("nav.billing_analytics"), icon: TrendingUp },
        { href: "/admin/billing/promo-codes", label: t("nav.billing_promo_codes"), icon: Tag },
      ],
    },
    {
      label: t("nav.product"),
      items: [
        { href: "/admin/content", label: t("nav.content_performance"), icon: FileText },
        { href: "/admin/referrals", label: t("nav.referrals"), icon: UserPlus },
        { href: "/admin/agentic", label: t("nav.agentic_posts"), icon: Bot },
        { href: "/admin/affiliate", label: t("nav.affiliate"), icon: Gift },
        { href: "/admin/announcement", label: t("nav.announcement"), icon: Megaphone },
        { href: "/admin/roadmap", label: t("nav.roadmap"), icon: Lightbulb },
      ],
    },
    {
      label: t("nav.system"),
      items: [
        { href: "/admin/audit", label: t("nav.audit_log"), icon: FileText },
        { href: "/admin/feature-flags", label: t("nav.feature_flags"), icon: ToggleLeft },
        { href: "/admin/jobs", label: t("nav.jobs"), icon: Activity },
        { href: "/admin/notifications", label: t("nav.notifications"), icon: Bell },
        { href: "/admin/webhooks", label: t("nav.webhooks"), icon: Webhook },
        { href: "/admin/soft-delete-recovery", label: t("nav.soft_delete_recovery"), icon: Trash2 },
      ],
    },
  ];

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
          "bg-muted/30 fixed start-0 top-0 bottom-0 flex h-dvh flex-col border-e transition-all duration-300",
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
            className="hover:bg-muted ms-auto hidden rounded-lg p-1 md:flex"
            aria-label={collapsed ? t("nav.expand_sidebar") : t("nav.collapse_sidebar")}
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
                  <LayoutDashboard className="me-2 h-4 w-4" />
                  {t("nav.back_to_app")}
                </>
              )}
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile Menu Button & Drawer - only render after hydration to avoid ID mismatch */}
      {hydrated && (
        <div className="fixed start-4 top-4 z-50 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-11 w-11">
                <Menu className="h-5 w-5" />
                <span className="sr-only">{t("nav.open_menu")}</span>
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
                    <LayoutDashboard className="me-2 h-4 w-4" />
                    {t("nav.back_to_app")}
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
