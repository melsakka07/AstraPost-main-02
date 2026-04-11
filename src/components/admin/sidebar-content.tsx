"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface SidebarSection {
  label: string;
  items: {
    href: string;
    label: string;
    icon: LucideIcon;
  }[];
}

interface AdminSidebarContentProps {
  sections: SidebarSection[];
  collapsed: boolean;
  pathname: string;
}

export function AdminSidebarContent({ sections, collapsed, pathname }: AdminSidebarContentProps) {
  return (
    <div className="flex-1 overflow-auto px-2 py-4 md:px-4">
      <nav className="space-y-5">
        {sections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="text-muted-foreground/60 mb-1 px-3 text-xs font-semibold tracking-wider uppercase">
                {section.label}
              </p>
            )}
            <div className="grid gap-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-muted-foreground hover:text-primary hover:bg-muted flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                      isActive && "bg-primary/10 text-primary font-medium",
                      collapsed && "justify-center"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
