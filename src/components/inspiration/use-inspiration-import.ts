"use client";

import { type Dispatch, type SetStateAction, useCallback, useState } from "react";
import { useElapsedTime } from "@/hooks/use-elapsed-time";
import type { ImportedTweetContext } from "@/lib/services/tweet-importer";
import { isValidTweetUrl } from "./inspiration-utils";

interface UseInspirationImportArgs {
  /** Translator scoped to the `inspiration` namespace. */
  t: (key: string) => string;
  /** Persist + optimistically record a successful import in history. */
  recordImport: (entry: {
    sourceTweetId: string;
    sourceTweetUrl: string;
    sourceAuthorHandle: string;
    sourceText: string;
  }) => void;
}

interface UseInspirationImportResult {
  tweetUrl: string;
  setTweetUrl: Dispatch<SetStateAction<string>>;
  isValidUrl: boolean;
  setIsValidUrl: Dispatch<SetStateAction<boolean>>;
  isLoading: boolean;
  importElapsed: number;
  importedData: ImportedTweetContext | null;
  setImportedData: Dispatch<SetStateAction<ImportedTweetContext | null>>;
  showThreadContext: boolean;
  setShowThreadContext: Dispatch<SetStateAction<boolean>>;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  handleUrlChange: (value: string) => void;
  handleImport: () => Promise<void>;
  /** Re-import a known-valid URL (used by re-adapt); switches loading state but
   * does not write history. Returns true on success. */
  reimportUrl: (url: string) => Promise<boolean>;
  handleClear: () => void;
}

/**
 * Owns the URL import + adaptation flow: URL state + inline validation, the
 * tweet-lookup fetch, loading/elapsed timer, imported data, the thread-context
 * toggle, and clear. Records successful imports to history via `recordImport`.
 * Behavior is identical to the inline implementation it replaced.
 */
export function useInspirationImport({
  t,
  recordImport,
}: UseInspirationImportArgs): UseInspirationImportResult {
  const [tweetUrl, setTweetUrl] = useState("");
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importedData, setImportedData] = useState<ImportedTweetContext | null>(null);
  const [showThreadContext, setShowThreadContext] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const importElapsed = useElapsedTime(isLoading);

  const handleUrlChange = useCallback((value: string) => {
    setTweetUrl(value);
    setIsValidUrl(isValidTweetUrl(value));
    setError(null);
  }, []);

  const handleImport = useCallback(async () => {
    if (!isValidUrl || !tweetUrl.trim()) return;

    setIsLoading(true);
    setError(null);
    setImportedData(null);
    setShowThreadContext(false);

    try {
      const response = await fetch("/api/x/tweet-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweetUrl }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to import tweet");
      }

      const result = await response.json();
      setImportedData(result.data);

      recordImport({
        sourceTweetId: result.data.originalTweet.id,
        sourceTweetUrl: tweetUrl,
        sourceAuthorHandle: result.data.originalTweet.author.username,
        sourceText: result.data.originalTweet.text,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_import"));
    } finally {
      setIsLoading(false);
    }
  }, [isValidUrl, tweetUrl, t, recordImport]);

  const reimportUrl = useCallback(
    async (url: string) => {
      setTweetUrl(url);
      setIsValidUrl(true);

      try {
        setIsLoading(true);
        const response = await fetch("/api/x/tweet-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tweetUrl: url }),
        });

        if (!response.ok) {
          throw new Error("Failed to import tweet");
        }

        const result = await response.json();
        setImportedData(result.data);
        return true;
      } catch {
        setError(t("error_reimport"));
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

  const handleClear = useCallback(() => {
    setTweetUrl("");
    setIsValidUrl(false);
    setImportedData(null);
    setShowThreadContext(false);
    setError(null);

    // Clear sessionStorage
    try {
      sessionStorage.removeItem("inspiration_current_url");
      sessionStorage.removeItem("inspiration_current_data");
    } catch {
      // Ignore
    }
  }, []);

  return {
    tweetUrl,
    setTweetUrl,
    isValidUrl,
    setIsValidUrl,
    isLoading,
    importElapsed,
    importedData,
    setImportedData,
    showThreadContext,
    setShowThreadContext,
    error,
    setError,
    handleUrlChange,
    handleImport,
    reimportUrl,
    handleClear,
  };
}
