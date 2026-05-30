"use client";

import type { ElementType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CreditCard, User, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type SettingsTabIcon = "profile" | "subscription" | "notifications" | "team" | "accounts";

const ICONS: Record<SettingsTabIcon, ElementType> = {
  profile: User,
  subscription: CreditCard,
  notifications: Bell,
  team: Users,
  accounts: Zap,
};

interface TabDef {
  label: string;
  href: string;
  icon: SettingsTabIcon;
}

export function SettingsTabBar({ tabs }: { tabs: TabDef[] }) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  return (
    <div className="border-b">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = ICONS[tab.icon];
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
  );
}
