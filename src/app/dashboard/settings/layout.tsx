"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, CreditCard, Bell, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("settings");
  const pathname = usePathname();

  const tabs = [
    { label: t("nav.profile"), href: "/dashboard/settings/profile", icon: User },
    { label: t("nav.subscription"), href: "/dashboard/settings/billing", icon: CreditCard },
    { label: t("nav.notifications"), href: "/dashboard/settings/notifications", icon: Bell },
    { label: t("nav.accounts"), href: "/dashboard/settings/integrations", icon: Zap },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive(tab.href)
                    ? "border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground border-transparent"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
