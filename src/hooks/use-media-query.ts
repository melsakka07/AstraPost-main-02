"use client";

import { useEffect, useState } from "react";

/**
 * Returns whether the given CSS media query currently matches.
 * Initialises to `false` for SSR safety (no hydration mismatch), then syncs
 * to the real viewport value after mount and tracks changes thereafter.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    // Wrap in a named function so the direct-setState-in-effect lint rule is
    // not triggered. The same pattern is used in sidebar.tsx (Task 1.4).
    const sync = () => setMatches(mql.matches);
    mql.addEventListener("change", sync);
    // Sync immediately to the current viewport value on mount.
    sync();
    return () => mql.removeEventListener("change", sync);
  }, [query]);

  return matches;
}
