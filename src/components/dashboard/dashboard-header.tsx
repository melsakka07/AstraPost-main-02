
"use client";

import { Menu } from "lucide-react";
import { UserProfile } from "@/components/auth/user-profile";
import { AccountSwitcher } from "@/components/dashboard/account-switcher";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  user: {
    id: string;
    name: string;
    image: string | null;
  };
  currentTeamId: string;
  memberships: {
    team: {
      id: string;
      name: string;
      image: string | null;
    };
    role: string;
  }[];
}

export function DashboardHeader({ user, currentTeamId, memberships }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-x-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:gap-x-4 sm:px-6 lg:px-8">
      {/* Mobile hamburger — part of the header flow (no overlap with content) */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open navigation menu"
        className="md:hidden h-10 w-10 shrink-0"
        onClick={(e) => { (e.currentTarget as HTMLButtonElement).blur(); document.dispatchEvent(new CustomEvent("sidebar:open")); }}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <AccountSwitcher
        user={user}
        currentTeamId={currentTeamId}
        teams={memberships}
      />
      <div className="flex flex-1 items-center justify-end gap-x-3 lg:gap-x-6">
        <NotificationBell />
        <div className="hidden h-6 w-px bg-border lg:block" aria-hidden="true" />
        <UserProfile />
      </div>
    </header>
  );
}
