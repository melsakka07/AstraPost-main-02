import { describe, expect, it } from "vitest";
import { isItemActive } from "@/components/dashboard/sidebar-active-state";
import { ALL_NAV_ITEMS } from "@/components/dashboard/sidebar-nav-data";

/**
 * Active-state regression tests for the mobile bottom navigation.
 *
 * Bug: the bottom nav used naive `pathname.startsWith(href + "/")`, so the
 * Dashboard root ("/dashboard") lit up on every child route (e.g. it appeared
 * highlighted alongside "Compose" on /dashboard/compose). The fix routes the
 * bottom nav through the shared `isItemActive` helper with the full nav list,
 * which picks the single most-specific match.
 */

// The 5 routes rendered in the bottom nav (see bottom-nav.tsx BOTTOM_NAV_ITEMS).
const BOTTOM_NAV_HREFS = [
  "/dashboard",
  "/dashboard/compose",
  "/dashboard/schedule",
  "/dashboard/ai",
  "/dashboard/settings",
] as const;

/** Returns the bottom-nav hrefs marked active for a given pathname. */
function activeBottomHrefs(pathname: string): string[] {
  return BOTTOM_NAV_HREFS.filter((href) => isItemActive(href, pathname, ALL_NAV_ITEMS));
}

describe("bottom nav active state", () => {
  it.each([
    ["/dashboard", ["/dashboard"]],
    ["/dashboard/compose", ["/dashboard/compose"]],
    ["/dashboard/schedule", ["/dashboard/schedule"]],
    ["/dashboard/ai", ["/dashboard/ai"]],
    // AI sub-tool that has no dedicated nav entry → the AI hub stays active.
    ["/dashboard/ai/writer", ["/dashboard/ai"]],
    // Settings index redirects to /profile → Settings stays active on children.
    ["/dashboard/settings/profile", ["/dashboard/settings"]],
  ])("marks exactly the expected item active on %s", (pathname, expected) => {
    expect(activeBottomHrefs(pathname)).toEqual(expected);
  });

  it("never highlights the Dashboard root on a child route", () => {
    for (const pathname of ["/dashboard/compose", "/dashboard/schedule", "/dashboard/ai/writer"]) {
      expect(activeBottomHrefs(pathname)).not.toContain("/dashboard");
    }
  });

  it("highlights no bottom-nav item for a 'More' route (e.g. analytics)", () => {
    // Analytics is reached via the "More" sheet, not the bottom nav — and because
    // it has its own entry in ALL_NAV_ITEMS, it suppresses the Dashboard fallback.
    expect(activeBottomHrefs("/dashboard/analytics")).toEqual([]);
  });
});
