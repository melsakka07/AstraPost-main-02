import { headers } from "next/headers";
import { formatDistanceToNow } from "date-fns";
import { enUS, ar } from "date-fns/locale";

/**
 * Safely format date to string in Server Components
 * Uses ISO format to avoid locale issues in production
 */
export function formatDateToLocaleString(date: Date): string {
  try {
    return date
      .toISOString()
      .replace("T", " ")
      .replace(/\.\d{3}Z$/, " UTC");
  } catch {
    return "Invalid date";
  }
}

/**
 * Get locale from headers for Server Components
 * Defaults to 'en-US' if locale header is missing
 */
async function getServerLocale(): Promise<string> {
  try {
    const headersList = await headers();
    const acceptLanguage = headersList.get("accept-language");
    if (acceptLanguage) {
      const parts = acceptLanguage.split(",");
      return parts[0]?.trim() ?? "en-US";
    }
  } catch {
    // Headers might not be available in all contexts
  }
  return "en-US";
}

/**
 * Safely format relative time in Server Components
 * Uses date-fns with proper locale handling
 */
export async function formatDistance(date: Date): Promise<string> {
  const localeCode = await getServerLocale();
  const locale = localeCode.startsWith("ar") ? ar : enUS;

  try {
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale,
    });
  } catch (error) {
    // Fallback to simple formatting if date-fns fails
    return formatDateToLocaleString(date);
  }
}

/**
 * Format date in a consistent way for UI display
 */
export function formatDate(date: Date | string | number): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return "Invalid date";
  }
  const parts = d.toISOString().split("T");
  return parts[0] ?? "Invalid date"; // YYYY-MM-DD
}
