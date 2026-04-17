import type { NavItem } from "./sidebar-nav-data";

/**
 * Determines if a navigation item is currently active based on the pathname.
 *
 * Logic:
 * 1. If pathname exactly matches item href, it's active
 * 2. Check if any other item has a more specific (longer) match
 * 3. If a more specific match exists, this item is NOT active
 * 4. Otherwise, check if pathname starts with item href + slash
 *
 * This prevents parent routes from appearing selected when viewing child routes.
 * For example, /dashboard/analytics/viral only shows "Viral Analyzer" as active,
 * not both "Analytics" and "Viral Analyzer".
 */
export function isItemActive(itemHref: string, pathname: string, allItems: NavItem[]): boolean {
  // Exact match
  if (pathname === itemHref) return true;

  // Check if pathname is a prefix of another item (more specific match)
  const isPrefixOf = (prefix: string, path: string) =>
    path === prefix || path.startsWith(`${prefix}/`);

  const hasMoreSpecificMatch = allItems.some(
    (other) =>
      other.href !== itemHref &&
      other.href.length > itemHref.length &&
      isPrefixOf(other.href, pathname)
  );

  // If a more specific item matches, this one is not active
  if (hasMoreSpecificMatch) return false;

  // Check if pathname starts with this item's path
  return pathname.startsWith(`${itemHref}/`);
}
