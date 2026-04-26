import { cookies } from "next/headers";
import type { Metadata } from "next";

type LocalizedString = { en: string; ar: string };

function pick(locale: string, strings: LocalizedString): string {
  return locale === "ar" ? strings.ar : strings.en;
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://astrapost.app";

export async function getSeoLocale(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get("locale")?.value || "en";
}

/**
 * Build hreflang alternates for cookie-based locale strategy.
 * Each page gets ?lang=ar and ?lang=en alternate URLs so Google can
 * discover and index both language versions.
 */
function buildAlternates(path?: string): Metadata["alternates"] {
  const base = path ? `${BASE_URL}${path}` : BASE_URL;
  const separator = path?.includes("?") ? "&" : "?";
  return {
    canonical: path ?? "/",
    languages: {
      en: path ? `${base}${separator}lang=en` : `${base}${separator}lang=en`,
      ar: path ? `${base}${separator}lang=ar` : `${base}${separator}lang=ar`,
    },
  };
}

export async function generateSeoMetadata(
  title: LocalizedString,
  description: LocalizedString,
  options?: {
    path?: string;
    ogTitle?: LocalizedString;
    ogDescription?: LocalizedString;
  }
): Promise<Metadata> {
  const locale = await getSeoLocale();
  const ogTitle = options?.ogTitle ?? title;
  const ogDescription = options?.ogDescription ?? description;

  return {
    title: pick(locale, title),
    description: pick(locale, description),
    alternates: buildAlternates(options?.path),
    ...(options?.path && {
      openGraph: {
        title: pick(locale, ogTitle),
        description: pick(locale, ogDescription),
        url: options.path,
      },
    }),
  };
}
