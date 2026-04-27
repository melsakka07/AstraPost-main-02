"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ExternalLink, Image as ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Drawer as DrawerPrimitive } from "vaul";
import { LogoMark } from "@/components/brand";
import { isItemActive } from "@/components/dashboard/sidebar-active-state";
import { CollapsibleSection } from "@/components/dashboard/sidebar-collapsible-section";
import { SIDEBAR_SECTIONS } from "@/components/dashboard/sidebar-nav-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "@/lib/auth-client";
import type { MonthlyAiUsage } from "@/lib/services/ai-quota";
import { cn } from "@/lib/utils";

// Flattened array of all nav items for active state checking
const allNavItems = SIDEBAR_SECTIONS.flatMap((section) => section.items);

// ── SidebarContent ────────────────────────────────────────────────────────────

interface ImageQuota {
  used: number;
  limit: number;
  remaining: number;
}

interface SidebarContentProps {
  pathname: string;
  onNavigate?: () => void;
  aiUsage: MonthlyAiUsage | null;
  imageUsage: MonthlyAiUsage | null;
  /** True when rendered inside the mobile Drawer — enables M2/M3/M6/M7 behaviour */
  isMobile?: boolean;
  /** M7 — user info shown in mobile drawer header */
  user?: { name: string; image: string | null };
  /** Show admin-only nav items */
  isAdmin?: boolean;
  /** User plan for Pro badge link logic */
  userPlan?: string;
}

function SidebarContent({
  pathname,
  onNavigate,
  aiUsage,
  imageUsage,
  isMobile = false,
  user,
  referralsEnabled = true,
  isAdmin = false,
  userPlan = "free",
}: SidebarContentProps & { referralsEnabled?: boolean }) {
  const t = useTranslations("nav");
  const tSidebar = useTranslations("sidebar");

  const imageQuota: ImageQuota | null = imageUsage
    ? {
        used: imageUsage.used,
        limit: imageUsage.limit ?? -1,
        remaining: imageUsage.limit === null ? -1 : Math.max(0, imageUsage.limit - imageUsage.used),
      }
    : null;

  const aiProgress =
    aiUsage && typeof aiUsage.limit === "number" && aiUsage.limit > 0
      ? Math.min(100, Math.round((aiUsage.used / aiUsage.limit) * 100))
      : 0;

  const aiProgressLabel = aiUsage && aiUsage.limit === null ? t("unlimited") : `${aiProgress}%`;

  const imageProgress =
    imageQuota && typeof imageQuota.limit === "number" && imageQuota.limit > 0
      ? Math.min(100, Math.round((imageQuota.used / imageQuota.limit) * 100))
      : 0;

  const imageProgressLabel =
    imageQuota && imageQuota.limit === -1 ? t("unlimited") : `${imageProgress}%`;

  const linkPy = isMobile ? "py-3" : "py-2.5"; // M3

  const handleSignOut = () =>
    signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });

  // Filter sidebar sections based on feature flags and admin access
  const filteredSections = SIDEBAR_SECTIONS.map((section) => {
    let items = section.items;
    // Hide admin-only items from non-admins
    if (!isAdmin) {
      items = items.filter((item) => !item.isAdmin);
    }
    // Hide Referrals when feature flag is off
    if (section.label === "Growth" && !referralsEnabled) {
      items = items.filter((item) => item.label !== "Referrals");
    }
    return { ...section, items };
  }).filter((section) => section.items.length > 0);

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
            aria-label={t("sign_out")}
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
        className="border-border flex h-16 shrink-0 items-center gap-2 border-b px-6 transition-opacity hover:opacity-80 rtl:flex-row-reverse"
        aria-label={t("go_home")}
      >
        <LogoMark size={24} className="text-primary" />
        <span className="text-xl font-bold tracking-tight">AstraPost</span>
      </Link>

      {/* Navigation sections */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4"
        aria-label={tSidebar("dashboard_navigation")}
      >
        {filteredSections.map((section, idx) => {
          const sectionLabelKey = section.label.toLowerCase().replace(/\s+/g, "_");
          const translatedSectionLabel = t(sectionLabelKey as any, { defaultValue: section.label });

          return (
            <div key={section.label} className={cn(idx > 0 && "mt-6")}>
              {idx === 0 ? (
                // Overview — no label, always visible, no collapse
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = isItemActive(item.href, pathname, allNavItems);
                    const itemLabelKey = item.label.toLowerCase().replace(/\s+/g, "_");
                    const translatedItemLabel = t(itemLabelKey as any, {
                      defaultValue: item.label,
                    });
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
                              ? "bg-primary/15 text-primary font-semibold"
                              : "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-4.5 w-4.5 shrink-0" />
                        {translatedItemLabel}
                      </Link>
                    );
                  })}
                </div>
              ) : section.collapsible ? (
                // M2 — collapsible on mobile, always expanded on desktop
                <CollapsibleSection
                  section={section}
                  pathname={pathname}
                  allNavItems={allNavItems}
                  {...(onNavigate !== undefined && { onNavigate })}
                  isMobile={isMobile}
                  userPlan={userPlan}
                  t={t}
                />
              ) : (
                // Regular section with label — always expanded
                <>
                  <p className="text-muted-foreground/60 mb-1.5 px-3 text-[11px] font-semibold tracking-wider uppercase">
                    {translatedSectionLabel}
                  </p>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const isActive = isItemActive(item.href, pathname, allNavItems);
                      const itemLabelKey = item.label.toLowerCase().replace(/\s+/g, "_");
                      const translatedItemLabel = t(itemLabelKey as any, {
                        defaultValue: item.label,
                      });
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
                                ? "bg-primary/15 text-primary font-semibold"
                                : "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <item.icon className="h-4.5 w-4.5 shrink-0" />
                          {translatedItemLabel}
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}

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
            <span>{t("roadmap")}</span>
          </Link>
        </div>
      </nav>

      {/* Bottom: AI credits + image quota + sign out */}
      <div className="border-border shrink-0 space-y-3 border-t p-4">
        <div className="border-border bg-muted/30 space-y-2 rounded-lg border p-3">
          {aiUsage ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-foreground text-xs font-medium">{t("ai_credits")}</span>
                <span className="text-muted-foreground text-xs">{aiProgressLabel}</span>
              </div>
              <Progress value={aiProgress} className="h-1.5" />
              <p className="text-muted-foreground text-xs">
                {typeof aiUsage.limit === "number"
                  ? `${aiUsage.used}/${aiUsage.limit} ${t("used_this_month")}`
                  : `${aiUsage.used} ${t("used_this_month")}`}
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

        <div className="border-border bg-muted/30 space-y-2 rounded-lg border p-3">
          {imageQuota ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="h-3 w-3" />
                  <span className="text-foreground text-xs font-medium">{t("images_credits")}</span>
                </div>
                <span className="text-muted-foreground text-xs">{imageProgressLabel}</span>
              </div>
              <Progress value={imageProgress} className="h-1.5" />
              <p className="text-muted-foreground text-xs">
                {typeof imageQuota.limit === "number" && imageQuota.limit !== -1
                  ? `${imageQuota.used}/${imageQuota.limit} ${t("used_this_month")}`
                  : `${imageQuota.used} ${t("used_this_month")}`}
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-12" />
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
            {t("sign_out")}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  aiUsage: MonthlyAiUsage | null;
  imageUsage: MonthlyAiUsage | null;
  /** M7 — user info for mobile Drawer header */
  user?: { name: string; image: string | null };
  referralsEnabled?: boolean;
  /** Show admin-only nav items */
  isAdmin?: boolean;
  /** User plan for Pro badge link logic */
  userPlan?: string;
}

export function Sidebar({
  aiUsage,
  imageUsage,
  user,
  referralsEnabled = true,
  isAdmin = false,
  userPlan = "free",
}: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [sheetSide, setSheetSide] = useState<"left" | "right">("left");
  const tMenu = useTranslations("mobile_menu");

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
          imageUsage={imageUsage}
          isMobile={false}
          referralsEnabled={referralsEnabled}
          isAdmin={isAdmin}
          userPlan={userPlan}
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
            <DrawerPrimitive.Title className="sr-only">
              {tMenu("navigation_menu")}
            </DrawerPrimitive.Title>
            <DrawerPrimitive.Description className="sr-only">
              {tMenu("main_navigation_links")}
            </DrawerPrimitive.Description>
            <SidebarContent
              pathname={pathname}
              onNavigate={() => setOpen(false)}
              aiUsage={aiUsage}
              imageUsage={imageUsage}
              isMobile={true}
              referralsEnabled={referralsEnabled}
              isAdmin={isAdmin}
              userPlan={userPlan}
              {...(user !== undefined && { user })}
            />
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Portal>
      </DrawerPrimitive.Root>
    </>
  );
}
