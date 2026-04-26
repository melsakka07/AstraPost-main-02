import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

function detectLocaleFromAcceptLanguage(acceptLanguage: string | null): string {
  if (!acceptLanguage) return "en";
  const prefersArabic = /(^|,)\s*ar(-[A-Z]+)?\s*(;q=0\.[5-9])?/.test(acceptLanguage);
  return prefersArabic ? "ar" : "en";
}

/** Extract ?lang= value from the request URL if present. */
function getLangFromUrl(headersList: Headers): string | null {
  try {
    const host = headersList.get("host") || "";
    const proto = headersList.get("x-forwarded-proto") || "https";
    const pathAndQuery =
      headersList.get("x-invoke-path") || headersList.get("x-middleware-request-url") || "";
    // x-invoke-path gives just the path+query, e.g. /pricing?lang=ar
    const url = pathAndQuery.startsWith("http")
      ? pathAndQuery
      : `${proto}://${host}${pathAndQuery}`;
    const parsed = new URL(url);
    return parsed.searchParams.get("lang");
  } catch {
    return null;
  }
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headersList = await headers();
  let locale = cookieStore.get("locale")?.value;

  // Query param ?lang= takes priority (used for hreflang alternate URLs)
  const urlLang = getLangFromUrl(headersList);
  if (urlLang && (urlLang === "ar" || urlLang === "en" || urlLang === "pseudo")) {
    locale = urlLang;
  }

  // Pseudo-locale for RTL QA testing: activate via ?lang=pseudo
  // Wraps all strings with RTL markers and inflates lengths by ~30%
  if (locale === "pseudo") {
    return {
      locale: "pseudo",
      messages: (await import(`./messages/pseudo.json`)).default,
      timeZone: "UTC",
      formats: {
        dateTime: {
          short: { year: "numeric", month: "short", day: "numeric" },
        },
      },
    };
  }

  if (!locale) {
    try {
      locale = detectLocaleFromAcceptLanguage(headersList.get("accept-language"));
    } catch {
      locale = "en";
    }
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
    timeZone: "UTC",
    formats: {
      dateTime: {
        short: {
          year: "numeric",
          month: "short",
          day: "numeric",
        },
      },
    },
  };
});
