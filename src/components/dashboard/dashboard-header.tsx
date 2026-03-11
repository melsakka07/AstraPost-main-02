
"use client";

import { UserProfile } from "@/components/auth/user-profile";
import { AccountSwitcher } from "@/components/dashboard/account-switcher";
import { NotificationBell } from "@/components/dashboard/notification-bell";

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
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <AccountSwitcher 
        user={user}
        currentTeamId={currentTeamId}
        teams={memberships}
      />
      <div className="flex flex-1 justify-end gap-x-4 lg:gap-x-6 items-center">
          <NotificationBell />
          <div className="h-6 w-px bg-border hidden lg:block" aria-hidden="true" />
          <UserProfile />
      </div>
    </header>
  );
}
