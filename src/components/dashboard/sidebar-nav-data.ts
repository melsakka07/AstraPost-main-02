import {
  LayoutDashboard,
  PenSquare,
  FileText,
  BarChart2,
  CalendarDays,
  ListChecks,
  Settings,
  Wand2,
  Sparkles,
  History,
  Trophy,
  Share2,
  Lightbulb,
  DollarSign,
  MessageSquare,
} from "lucide-react";

export interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  isPro?: boolean;
  isNew?: boolean;
  /** Only visible to admin users */
  isAdmin?: boolean;
  /** Optional identifier for the product tour (driver.js) */
  dataTour?: string;
  /** When set to "inbox", the sidebar renders an unread badge next to the label */
  unreadBadge?: "inbox";
}

export interface SidebarSection {
  label: string;
  items: NavItem[];
  /** When true, the section collapses in the mobile Sheet */
  collapsible?: boolean;
}

/**
 * Navigation Structure for Dashboard Sidebar
 *
 * Rules:
 * 1. Every /dashboard/* route MUST have an entry here or be reachable from a
 *    page that does. Never ship a dashboard page without a sidebar path.
 * 2. This array is the single source of truth for navigation. If a page is
 *    also linked from a hub/overview card, the hub must be the sidebar entry —
 *    do NOT list both the hub and its sub-pages as peer siblings.
 * 3. Hub pages (e.g. /dashboard/ai) are supplementary launchers. Their cards
 *    must not duplicate links already present here at the same level.
 */
export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    label: "Overview",
    items: [{ icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" }],
  },
  {
    label: "Create",
    items: [
      { icon: PenSquare, label: "Compose", href: "/dashboard/compose", dataTour: "compose" },
      { icon: FileText, label: "Drafts", href: "/dashboard/drafts" },
      { icon: MessageSquare, label: "inbox", href: "/dashboard/inbox", unreadBadge: "inbox" },
      { icon: CalendarDays, label: "Schedule", href: "/dashboard/schedule", dataTour: "schedule" },
    ],
  },
  {
    label: "Grow",
    collapsible: true,
    items: [
      {
        icon: Sparkles,
        label: "AI Tools",
        href: "/dashboard/ai",
        isNew: true,
        dataTour: "ai-tools",
      },
      {
        icon: Lightbulb,
        label: "Import & Adapt",
        href: "/dashboard/inspiration",
        dataTour: "inspiration",
      },
      {
        icon: Wand2,
        label: "Agentic Posting",
        href: "/dashboard/ai/agentic",
        isPro: true,
      },
      { icon: BarChart2, label: "Analytics", href: "/dashboard/analytics", dataTour: "analytics" },
      {
        icon: History,
        label: "History",
        href: "/dashboard/ai/history",
      },
    ],
  },
  {
    label: "Account",
    items: [
      { icon: Settings, label: "Settings", href: "/dashboard/settings" },
      { icon: Trophy, label: "Achievements", href: "/dashboard/achievements" },
      { icon: Share2, label: "Referrals", href: "/dashboard/referrals" },
      { icon: DollarSign, label: "Affiliate Dashboard", href: "/dashboard/affiliate" },
    ],
  },
];

/**
 * Admin-only navigation section — appended to the sidebar only when `isAdmin` is true.
 * Each page referenced here MUST call `requireAdmin()` individually because they sit
 * under the dashboard layout (which uses getTeamContext(), not requireAdmin()).
 * Forgetting this leaves the page accessible to non-admin users who know the URL.
 */
export const ADMIN_SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    label: "Admin",
    items: [{ icon: ListChecks, label: "Jobs", href: "/dashboard/jobs", isAdmin: true }],
  },
];

/**
 * Flattened list of every nav item — the single source of truth for active-state
 * detection (`isItemActive`). Shared by the sidebar and the mobile bottom nav so
 * both resolve the "most specific match" identically.
 */
export const ALL_NAV_ITEMS: NavItem[] = [...SIDEBAR_SECTIONS, ...ADMIN_SIDEBAR_SECTIONS].flatMap(
  (section) => section.items
);
