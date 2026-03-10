"use client";

import { useState } from "react";
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
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

interface SidebarContentProps {
  pathname: string;
  onNavigate?: () => void;
}

function SidebarContent({ pathname, onNavigate }: SidebarContentProps) {
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

      <div className="p-4 border-t border-border">
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
      <div className="hidden md:flex md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 flex-col bg-card border-r border-border">
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
