"use client";

import { type Dispatch, type SetStateAction, useCallback, useEffect } from "react";
import type { useRouter, useSearchParams } from "next/navigation";
import type { ImportedTweetContext } from "@/lib/services/tweet-importer";
import { isValidTweetUrl } from "./inspiration-utils";

interface UseInspirationComposerBridgeArgs {
  router: ReturnType<typeof useRouter>;
  searchParams: ReturnType<typeof useSearchParams>;
  tweetUrl: string;
  setTweetUrl: Dispatch<SetStateAction<string>>;
  setIsValidUrl: Dispatch<SetStateAction<boolean>>;
  importedData: ImportedTweetContext | null;
  setImportedData: Dispatch<SetStateAction<ImportedTweetContext | null>>;
}

interface UseInspirationComposerBridgeResult {
  /** Store adapted tweets + source attribution, then navigate to the composer. */
  handleSendToComposer: (tweets: string[]) => void;
}

/**
 * Bridges the inspiration page to the composer: restores `tweetUrl` +
 * `importedData` from the `?url` param or sessionStorage on mount, persists them
 * to sessionStorage as they change, and hands adapted tweets + attribution to
 * the composer via sessionStorage before navigating. Behavior is identical to
 * the inline implementation it replaced.
 */
export function useInspirationComposerBridge({
  router,
  searchParams,
  tweetUrl,
  setTweetUrl,
  setIsValidUrl,
  importedData,
  setImportedData,
}: UseInspirationComposerBridgeArgs): UseInspirationComposerBridgeResult {
  // Initialize from URL search params or sessionStorage (one-time mount
  // hydration from an external store — synchronous setState is intentional).
  useEffect(() => {
    // 1. Check URL parameters (e.g., ?url=https://x.com/...)
    const urlParam = searchParams.get("url");
    if (urlParam && isValidTweetUrl(urlParam)) {
      setTweetUrl(urlParam);
      setIsValidUrl(true);
      return;
    }

    // 2. Fallback to session storage to persist across reloads
    try {
      const storedUrl = sessionStorage.getItem("inspiration_current_url");
      if (storedUrl && isValidTweetUrl(storedUrl)) {
        setTweetUrl(storedUrl);
        setIsValidUrl(true);

        // Also try to restore the imported data to avoid refetching on every reload
        const storedData = sessionStorage.getItem("inspiration_current_data");
        if (storedData) {
          setImportedData(JSON.parse(storedData));
        }
      }
    } catch {
      // Ignore
    }
  }, [searchParams, setTweetUrl, setIsValidUrl, setImportedData]);

  // Save current url/data to sessionStorage whenever they change
  useEffect(() => {
    try {
      if (tweetUrl) {
        sessionStorage.setItem("inspiration_current_url", tweetUrl);
      } else {
        sessionStorage.removeItem("inspiration_current_url");
      }

      if (importedData) {
        sessionStorage.setItem("inspiration_current_data", JSON.stringify(importedData));
      } else {
        sessionStorage.removeItem("inspiration_current_data");
      }
    } catch {
      // Ignore
    }
  }, [tweetUrl, importedData]);

  const handleSendToComposer = useCallback(
    (tweets: string[]) => {
      sessionStorage.setItem("inspiration_tweets", JSON.stringify(tweets));
      if (importedData) {
        sessionStorage.setItem("inspiration_source_id", importedData.originalTweet.id);
        // W4: Store source attribution for display in Composer
        try {
          sessionStorage.setItem(
            "inspiration_attribution",
            JSON.stringify({
              handle: importedData.originalTweet.author.username,
              url: tweetUrl,
            })
          );
        } catch {
          // sessionStorage may be unavailable — fail silently
        }
      }
      router.push("/dashboard/compose");
    },
    [router, importedData, tweetUrl]
  );

  return { handleSendToComposer };
}
