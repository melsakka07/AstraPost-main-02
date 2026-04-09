import { z } from "zod";

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ar", label: "Arabic" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "tr", label: "Turkish" },
  { code: "ru", label: "Russian" },
  { code: "hi", label: "Hindi" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

/** Full 10-language enum — use in schemas that support all supported languages. */
export const LANGUAGE_ENUM = z.enum(["ar", "en", "fr", "de", "es", "it", "pt", "tr", "ru", "hi"]);

/** Restricted 2-language enum for routes that only support Arabic / English. */
export const LANGUAGE_ENUM_LIMITED = z.enum(["ar", "en"]);

/** Canonical tone enum — single source of truth across all AI routes. */
export const TONE_ENUM = z.enum([
  "professional",
  "casual",
  "educational",
  "inspirational",
  "humorous",
  "viral",
  "controversial",
]);
export type ToneCode = z.infer<typeof TONE_ENUM>;
