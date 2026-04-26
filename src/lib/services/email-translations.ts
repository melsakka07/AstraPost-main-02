import ar from "@/i18n/messages/ar.json";
import en from "@/i18n/messages/en.json";

type EmailMessages = typeof en.emails;

/**
 * Returns the email translation messages for the given locale.
 * Falls back to English for unsupported locales.
 */
export function getEmailTranslations(locale: string): EmailMessages {
  if (locale === "ar") return ar.emails as EmailMessages;
  return en.emails as EmailMessages;
}
