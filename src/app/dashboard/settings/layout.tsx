"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, CreditCard, Bell, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { label: "Profile", href: "/dashboard/settings/profile", icon: User },
    { label: "Billing", href: "/dashboard/settings/billing", icon: CreditCard },
    { label: "Notifications", href: "/dashboard/settings/notifications", icon: Bell },
    { label: "Integrations", href: "/dashboard/settings/integrations", icon: Zap },
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
