import { cookies } from "next/headers";
import type { Metadata } from "next";

type LocalizedString = { en: string; ar: string };

function pick(locale: string, strings: LocalizedString): string {
  return locale === "ar" ? strings.ar : strings.en;
}

export async function getSeoLocale(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get("locale")?.value || "en";
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
    ...(options?.path && {
      alternates: { canonical: options.path },
      openGraph: {
        title: pick(locale, ogTitle),
        description: pick(locale, ogDescription),
        url: options.path,
      },
    }),
  };
}
