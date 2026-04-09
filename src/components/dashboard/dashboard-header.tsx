"use client";

import dynamic from "next/dynamic";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

// All Radix-rooted components must use ssr: false so server and client
// render the same (null) structure.  If even one Radix component renders
// on the server while another is skipped, React's useId() counters
// diverge and EVERY downstream Radix component gets mismatched IDs.

const AccountSwitcher = dynamic(
  () => import("@/components/dashboard/account-switcher").then((m) => m.AccountSwitcher),
  { ssr: false }
);

const NotificationBell = dynamic(
  () => import("@/components/dashboard/notification-bell").then((m) => m.NotificationBell),
  { ssr: false }
);

const UserProfile = dynamic(
  () => import("@/components/auth/user-profile").then((m) => m.UserProfile),
  { ssr: false }
);

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
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 flex h-14 shrink-0 items-center gap-x-3 border-b px-4 backdrop-blur sm:gap-x-4 sm:px-6 lg:px-8">
      {/* Mobile hamburger — part of the header flow (no overlap with content) */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open navigation menu"
        className="h-10 w-10 shrink-0 md:hidden"
        onClick={(e) => {
          (e.currentTarget as HTMLButtonElement).blur();
          document.dispatchEvent(new CustomEvent("sidebar:open"));
        }}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <AccountSwitcher user={user} currentTeamId={currentTeamId} teams={memberships} />
      <div className="flex flex-1 items-center justify-end gap-x-3 lg:gap-x-6">
        <NotificationBell />
        <div className="bg-border hidden h-6 w-px lg:block" aria-hidden="true" />
        <UserProfile user={user} />
      </div>
    </header>
  );
}
