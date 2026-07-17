"use client";

import { useMediaQuery } from "@/hooks/use-media-query";

/**
 * Returns whether the user prefers reduced motion. SSR-safe: `false` on the
 * server and first client render, then syncs to the real preference after
 * mount and tracks changes thereafter.
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
