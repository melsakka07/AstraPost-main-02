"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  LineChart,
  Server,
  LogOut,
  Rocket,
  Menu,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { icon: Users, label: "Users", href: "/admin/users" },
  { icon: LineChart, label: "Metrics", href: "/admin/metrics" },
  { icon: Server, label: "Jobs", href: "/admin/jobs" },
];

interface SidebarContentProps {
  pathname: string;
  onNavigate?: () => void;
}

function SidebarContent({ pathname, onNavigate }: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full bg-background border-r border-border">
      <div className="p-6 flex items-center gap-2 border-b border-border h-16">
        <Rocket className="h-6 w-6 text-destructive" />
        <span className="text-xl font-bold">Admin Panel</span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-4">
          <div className="mb-4">
            <Link
                href="/dashboard"
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-5 w-5" />
                Back to App
            </Link>
          </div>
          
          <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Management
          </div>

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
                    ? "bg-destructive/10 text-destructive"
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

export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 flex-col">
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
