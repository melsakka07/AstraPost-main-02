import {
  LayoutDashboard,
  PenSquare,
  ListOrdered,
  FileText,
  BarChart2,
  TrendingUp,
  CalendarDays,
  ListChecks,
  Settings,
  Wand2,
  Sparkles,
  Users,
  History,
  Trophy,
  Share2,
  Lightbulb,
  UserPen,
  MessageCircle,
  DollarSign,
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
    label: "Content",
    items: [
      { icon: PenSquare, label: "Compose", href: "/dashboard/compose", dataTour: "compose" },
      { icon: FileText, label: "Drafts", href: "/dashboard/drafts" },
      { icon: ListOrdered, label: "Queue", href: "/dashboard/queue" },
      { icon: CalendarDays, label: "Calendar", href: "/dashboard/calendar", dataTour: "calendar" },
    ],
  },
  {
    label: "AI Tools",
    collapsible: true,
    items: [
      { icon: Sparkles, label: "Writer", href: "/dashboard/ai", isNew: true, dataTour: "ai-tools" },
      {
        icon: Lightbulb,
        label: "Inspiration",
        href: "/dashboard/inspiration",
        dataTour: "inspiration",
      },
      {
        icon: Wand2,
        label: "Agentic Posting",
        href: "/dashboard/ai/agentic",
        isPro: true,
      },
      { icon: History, label: "History", href: "/dashboard/ai/history", isAdmin: true },
      {
        icon: UserPen,
        label: "Bio Generator",
        href: "/dashboard/ai/bio",
        isPro: true,
      },
      {
        icon: MessageCircle,
        label: "Reply Generator",
        href: "/dashboard/ai/reply",
        isPro: true,
      },
      {
        icon: CalendarDays,
        label: "AI Calendar",
        href: "/dashboard/ai/calendar",
        isPro: true,
      },
    ],
  },
  {
    label: "Analytics",
    collapsible: true,
    items: [
      { icon: BarChart2, label: "Analytics", href: "/dashboard/analytics", dataTour: "analytics" },
      { icon: TrendingUp, label: "Viral Analyzer", href: "/dashboard/analytics/viral" },
      { icon: Users, label: "Competitor", href: "/dashboard/analytics/competitor", isPro: true },
    ],
  },
  {
    label: "Growth",
    items: [
      { icon: Trophy, label: "Achievements", href: "/dashboard/achievements" },
      { icon: Share2, label: "Referrals", href: "/dashboard/referrals" },
      { icon: DollarSign, label: "Affiliate Dashboard", href: "/dashboard/affiliate" },
    ],
  },
  {
    label: "System",
    items: [
      // ⚠️ ADMIN-ONLY PAGES: Each page referenced here MUST call `requireAdmin()` individually
      // because they sit under the dashboard layout (which uses getTeamContext(), not requireAdmin()).
      // Forgetting this leaves the page accessible to non-admin users who know the URL.
      { icon: ListChecks, label: "Jobs", href: "/dashboard/jobs", isAdmin: true },
      { icon: Settings, label: "Settings", href: "/dashboard/settings" },
    ],
  },
];
