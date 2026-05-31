import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getLangFromHeaders, resolveLocale } from "./locale";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headersList = await headers();

  // Account preference is the lowest-priority fallback (may be stale, but
  // defaults to "ar"). Read it so the resolved locale here matches the one the
  // root layout uses for <html dir> — otherwise direction and messages diverge.
  let sessionLanguage: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: headersList });
    sessionLanguage = session?.user?.language ?? null;
  } catch {
    /* anonymous request or session lookup failed — fall through to defaults */
  }

  const locale = resolveLocale({
    urlLang: getLangFromHeaders(headersList),
    cookieLocale: cookieStore.get("locale")?.value ?? null,
    acceptLanguage: headersList.get("accept-language"),
    sessionLanguage,
  });

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
