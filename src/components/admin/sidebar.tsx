"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart,
  BarChart2,
  CreditCard,
  LayoutDashboard,
  Lightbulb,
  Megaphone,
  ShieldCheck,
  Tag,
  ToggleLeft,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sidebarSections = [
  {
    label: "Overview",
    items: [
      { href: "/admin/metrics", label: "Metrics", icon: BarChart },
      { href: "/admin/stats", label: "Platform Stats", icon: BarChart2 },
    ],
  },
  {
    label: "Users",
    items: [{ href: "/admin/subscribers", label: "Subscribers", icon: Users }],
  },
  {
    label: "Billing",
    items: [
      { href: "/admin/billing", label: "Billing Overview", icon: CreditCard },
      { href: "/admin/billing/promo-codes", label: "Promo Codes", icon: Tag },
    ],
  },
  {
    label: "Product",
    items: [
      { href: "/admin/announcement", label: "Announcement", icon: Megaphone },
      { href: "/admin/roadmap", label: "Roadmap", icon: Lightbulb },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/feature-flags", label: "Feature Flags", icon: ToggleLeft },
      { href: "/admin/jobs", label: "Jobs (BullMQ)", icon: Activity },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="bg-muted/30 fixed top-0 bottom-0 left-0 flex h-dvh w-64 flex-col border-r">
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/admin" className="flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="text-primary h-6 w-6" />
          <span>Admin Panel</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto px-4 py-4">
        <nav className="space-y-5">
          {sidebarSections.map((section) => (
            <div key={section.label}>
              <p className="text-muted-foreground/60 mb-1 px-3 text-xs font-semibold tracking-wider uppercase">
                {section.label}
              </p>
              <div className="grid gap-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-muted-foreground hover:text-primary hover:bg-muted flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                      pathname === item.href && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
      <div className="mt-auto border-t p-4">
        <Link href="/dashboard">
          <Button variant="outline" className="w-full justify-start">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Back to App
          </Button>
        </Link>
      </div>
    </div>
  );
}
