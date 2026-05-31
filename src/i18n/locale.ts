/**
 * Single source of truth for locale resolution and direction.
 *
 * Both the root layout (`<html lang dir>` + NextIntlClientProvider locale) and
 * the next-intl request config (`getMessages()`) MUST resolve the locale the
 * same way — otherwise the document direction can disagree with the loaded
 * messages (e.g. RTL layout rendered with English text on first visit).
 *
 * These are pure functions with no server-only imports so they can be shared
 * by any server module without risk of leaking Node builtins into client code.
 */

export type AppLocale = "ar" | "en" | "pseudo";

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === "ar" || value === "en" || value === "pseudo";
}

/** RTL applies to Arabic and the pseudo locale used for RTL QA. */
export function getLocaleDirection(locale: string): "rtl" | "ltr" {
  return locale === "ar" || locale === "pseudo" ? "rtl" : "ltr";
}

/** True when the browser's Accept-Language header prefers Arabic. */
export function prefersArabic(acceptLanguage: string | null | undefined): boolean {
  if (!acceptLanguage) return false;
  return /(^|,)\s*ar(-[A-Z]+)?\s*(;q=0\.[5-9])?/.test(acceptLanguage);
}

/** Extract a `?lang=` value from the request URL if present (used by hreflang alternates). */
export function getLangFromHeaders(headersList: Headers): string | null {
  try {
    const host = headersList.get("host") || "";
    const proto = headersList.get("x-forwarded-proto") || "https";
    const pathAndQuery =
      headersList.get("x-invoke-path") || headersList.get("x-middleware-request-url") || "";
    const url = pathAndQuery.startsWith("http")
      ? pathAndQuery
      : `${proto}://${host}${pathAndQuery}`;
    return new URL(url).searchParams.get("lang");
  } catch {
    return null;
  }
}

/**
 * Resolve the active locale from all available signals.
 *
 * Priority (matches `.claude/rules/i18n.md`):
 *   1. `?lang=` query param  — hreflang alternate URLs
 *   2. `locale` cookie       — always fresh, set by the language switcher
 *   3. Arabic Accept-Language — first-time MENA visitors
 *   4. session.user.language — account preference (defaults to "ar")
 *   5. "en"                   — final fallback
 */
export function resolveLocale(opts: {
  urlLang?: string | null;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
  sessionLanguage?: string | null;
}): AppLocale {
  if (isAppLocale(opts.urlLang)) return opts.urlLang;
  if (isAppLocale(opts.cookieLocale)) return opts.cookieLocale;
  if (prefersArabic(opts.acceptLanguage)) return "ar";
  if (isAppLocale(opts.sessionLanguage)) return opts.sessionLanguage;
  return "en";
}
