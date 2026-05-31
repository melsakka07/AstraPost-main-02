import { describe, expect, it } from "vitest";
import { getLocaleDirection, isAppLocale, prefersArabic, resolveLocale } from "./locale";

describe("getLocaleDirection", () => {
  it("returns rtl for Arabic and pseudo, ltr otherwise", () => {
    expect(getLocaleDirection("ar")).toBe("rtl");
    expect(getLocaleDirection("pseudo")).toBe("rtl");
    expect(getLocaleDirection("en")).toBe("ltr");
    expect(getLocaleDirection("fr")).toBe("ltr");
  });
});

describe("isAppLocale", () => {
  it("accepts only supported locales", () => {
    expect(isAppLocale("ar")).toBe(true);
    expect(isAppLocale("en")).toBe(true);
    expect(isAppLocale("pseudo")).toBe(true);
    expect(isAppLocale("fr")).toBe(false);
    expect(isAppLocale(null)).toBe(false);
    expect(isAppLocale(undefined)).toBe(false);
  });
});

describe("prefersArabic", () => {
  it("detects Arabic preference from Accept-Language", () => {
    expect(prefersArabic("ar")).toBe(true);
    expect(prefersArabic("ar-SA,ar;q=0.9,en;q=0.8")).toBe(true);
    expect(prefersArabic("en-US,en;q=0.9")).toBe(false);
    expect(prefersArabic(null)).toBe(false);
    expect(prefersArabic("")).toBe(false);
  });
});

describe("resolveLocale", () => {
  it("prioritizes the ?lang= query param above everything", () => {
    expect(
      resolveLocale({
        urlLang: "en",
        cookieLocale: "ar",
        acceptLanguage: "ar",
        sessionLanguage: "ar",
      })
    ).toBe("en");
  });

  it("uses the cookie when no valid url lang is present", () => {
    expect(resolveLocale({ cookieLocale: "en", acceptLanguage: "ar", sessionLanguage: "ar" })).toBe(
      "en"
    );
  });

  it("falls back to Arabic Accept-Language before the session", () => {
    expect(resolveLocale({ acceptLanguage: "ar-SA,ar;q=0.9", sessionLanguage: "en" })).toBe("ar");
  });

  it("honors the session language when other signals are absent", () => {
    // Regression: account defaults to "ar"; an English browser with no cookie
    // must resolve to the session value so <html dir> matches the messages.
    expect(resolveLocale({ acceptLanguage: "en-US,en;q=0.9", sessionLanguage: "ar" })).toBe("ar");
  });

  it("defaults to English when no signal is available", () => {
    expect(resolveLocale({})).toBe("en");
  });

  it("ignores unsupported values at every level", () => {
    expect(resolveLocale({ urlLang: "fr", cookieLocale: "de", sessionLanguage: "es" })).toBe("en");
  });
});
