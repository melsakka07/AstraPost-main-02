"use client";

import { useEffect, useState } from "react";
import type { HistoryItem } from "./inspiration-types";

interface ImportedHistoryEntry {
  sourceTweetId: string;
  sourceTweetUrl: string;
  sourceAuthorHandle: string;
  sourceText: string;
}

interface UseInspirationHistoryResult {
  history: HistoryItem[];
  /**
   * Persist an imported tweet to history via the API (fire-and-forget,
   * non-critical) and optimistically prepend it to the local list, capped at
   * 20 entries. Behavior is identical to the inline implementation it replaced.
   */
  recordImport: (entry: ImportedHistoryEntry) => void;
}

/**
 * DB-backed import history (Wave 4). Fetches `GET /api/inspiration/history`
 * once on mount; failures fail silently (user sees empty history).
 */
export function useInspirationHistory(): UseInspirationHistoryResult {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Single mount fetch (not polling) — guarded with a cancelled flag so a fast
  // unmount never sets state after teardown.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/inspiration/history");
        if (res.ok && !cancelled) {
          const data = await res.json();
          setHistory(data.history as HistoryItem[]);
        }
      } catch {
        // Non-critical — silently fail, user sees empty history
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const recordImport = (entry: ImportedHistoryEntry) => {
    // Add to history via API
    fetch("/api/inspiration/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...entry, action: "imported" }),
    }).catch(() => {
      /* non-critical */
    });
    // Optimistic UI update
    setHistory((prev) => [
      {
        id: Date.now().toString(),
        ...entry,
        action: "imported",
        createdAt: new Date().toISOString(),
      },
      ...prev.slice(0, 19),
    ]);
  };

  return { history, recordImport };
}
