"use client";

import { useCallback, useEffect, useState } from "react";
import type { ImportedTweetContext } from "@/lib/services/tweet-importer";
import type { Bookmark } from "./inspiration-types";

interface UseInspirationBookmarksArgs {
  /** Translator scoped to the `inspiration` namespace. */
  t: (key: string) => string;
  setError: (message: string) => void;
  /** Show the auto-dismissing success toast (from the tabs hook). */
  showSuccess: (message: string) => void;
}

interface UseInspirationBookmarksResult {
  bookmarks: Bookmark[];
  isBookmarking: boolean;
  /** Bookmark the currently imported tweet (POST). */
  handleBookmark: (importedData: ImportedTweetContext | null, tweetUrl: string) => Promise<void>;
  /** Delete a bookmark by id (DELETE). */
  handleDeleteBookmark: (id: string) => Promise<void>;
}

/**
 * Owns bookmarks CRUD (Wave 4): mount fetch `GET /api/inspiration/bookmark`,
 * `POST` to bookmark the current import, and `DELETE /api/inspiration/bookmark/[id]`.
 * Re-adapt lives in the shell (it reuses the import hook). Behavior is identical
 * to the inline implementation it replaced.
 */
export function useInspirationBookmarks({
  t,
  setError,
  showSuccess,
}: UseInspirationBookmarksArgs): UseInspirationBookmarksResult {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isBookmarking, setIsBookmarking] = useState(false);

  // Single mount fetch (not polling). Failure is logged via the dynamic logger
  // import, matching the prior inline behavior.
  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        const response = await fetch("/api/inspiration/bookmark");
        if (response.ok) {
          const data = await response.json();
          setBookmarks(data.bookmarks || []);
        }
      } catch (err) {
        (await import("@/lib/logger")).logger.error("Failed to load bookmarks", { error: err });
      }
    };

    loadBookmarks();
  }, []);

  const handleBookmark = useCallback(
    async (importedData: ImportedTweetContext | null, tweetUrl: string) => {
      if (!importedData) return;

      setIsBookmarking(true);
      try {
        const response = await fetch("/api/inspiration/bookmark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceTweetId: importedData.originalTweet.id,
            sourceTweetUrl: tweetUrl,
            sourceAuthorHandle: importedData.originalTweet.author.username,
            sourceText: importedData.originalTweet.text,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to bookmark");
        }

        showSuccess(t("success_message"));

        // Add to local bookmarks state
        const bookmarkData = await response.json();
        if (bookmarkData.bookmark) {
          setBookmarks((prev) => [bookmarkData.bookmark, ...prev]);
        }
      } catch {
        setError(t("error_bookmark"));
      } finally {
        setIsBookmarking(false);
      }
    },
    [t, setError, showSuccess]
  );

  const handleDeleteBookmark = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/inspiration/bookmark/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete bookmark");
        }

        setBookmarks((prev) => prev.filter((b) => b.id !== id));
      } catch {
        setError(t("error_delete"));
      }
    },
    [t, setError]
  );

  return { bookmarks, isBookmarking, handleBookmark, handleDeleteBookmark };
}
