import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ locale }) => ({
  locale: locale || "en",
  messages: (await import(`./messages/${locale || "en"}.json`)).default,
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
}));
