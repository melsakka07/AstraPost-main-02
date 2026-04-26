import { z } from "zod";

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ar", label: "Arabic" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const LANGUAGE_ENUM = z.enum(["ar", "en"]);

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
