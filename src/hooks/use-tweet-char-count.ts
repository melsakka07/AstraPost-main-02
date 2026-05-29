"use client";

import { useMemo } from "react";
import {
  computeTweetCharCount,
  type ComputeTweetCharCountOptions,
  type TweetCharCount,
} from "@/lib/tweet-char";

/**
 * Thin client wrapper around the canonical {@link computeTweetCharCount} helper.
 *
 * Memoizes the derived counts so re-renders that don't change `text` or the
 * options stay cheap. SSR-safe: `computeTweetCharCount` is a pure function with
 * no browser APIs, so the initial value matches on server and client.
 */
export function useTweetCharCount(
  text: string,
  options: ComputeTweetCharCountOptions = {}
): TweetCharCount {
  const { tier, isThreadMode, precomputedCharCount, warnRatio } = options;
  return useMemo(
    () =>
      computeTweetCharCount(text, {
        ...(tier !== undefined && { tier }),
        ...(isThreadMode !== undefined && { isThreadMode }),
        ...(precomputedCharCount !== undefined && { precomputedCharCount }),
        ...(warnRatio !== undefined && { warnRatio }),
      }),
    [text, tier, isThreadMode, precomputedCharCount, warnRatio]
  );
}
