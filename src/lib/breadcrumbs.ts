import type { BreadcrumbItem } from "@/components/admin/breadcrumbs";

/**
 * Generate breadcrumb items from pathname for admin pages.
 * Example: "/admin/subscribers/123" → [{ label: "Subscribers", href: "/admin/subscribers" }, { label: "User #123" }]
 */
export function generateAdminBreadcrumbs(pathname: string, customLabel?: string): BreadcrumbItem[] {
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length <= 1) {
    // Root admin page
    return [];
  }

  const breadcrumbs: BreadcrumbItem[] = [];

  // Build breadcrumbs for each segment
  for (let i = 1; i < parts.length; i++) {
    const segment = parts[i] ?? "";
    const href = "/" + parts.slice(0, i + 1).join("/");

    // Skip dynamic segments (UUIDs, IDs) unless it's the last segment
    if (isDynamicSegment(segment) && i < parts.length - 1) {
      continue;
    }

    const label = formatSegmentLabel(segment);

    // Last segment is the current page (no href)
    if (i === parts.length - 1 && !isDynamicSegment(segment)) {
      breadcrumbs.push({ label: customLabel || label });
    } else if (i < parts.length - 1) {
      breadcrumbs.push({ label, href });
    } else if (isDynamicSegment(segment) && customLabel) {
      // Last segment is a dynamic ID with custom label
      breadcrumbs.push({ label: customLabel });
    }
  }

  return breadcrumbs;
}

/**
 * Check if a segment looks like a dynamic parameter (UUID, numeric ID, etc)
 */
function isDynamicSegment(segment: string): boolean {
  // UUID pattern
  if (/^[a-f0-9\-]{36}$/.test(segment)) return true;
  // Numeric ID
  if (/^\d+$/.test(segment)) return true;
  // Skip common dynamic markers
  if (segment === "[id]" || segment === "[userId]" || segment === "[slug]") return true;
  return false;
}

/**
 * Format a URL segment into a human-readable label.
 * Example: "billing-analytics" → "Billing Analytics"
 */
function formatSegmentLabel(segment: string): string {
  return segment
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
