"use client";

import { type MutableRefObject, useEffect, useRef, useState } from "react";
import type { useRouter } from "next/navigation";
import { toast } from "sonner";
import { clientLogger } from "@/lib/client-logger";
import { draftsHaveContent, serializeDraftsForSave } from "./composer-utils";
import type { TweetDraft } from "./composer-types";

type AppRouter = ReturnType<typeof useRouter>;
type Translator = (key: string, values?: Record<string, string | number | Date>) => string;

interface UseComposerDraftsArgs {
  tweets: TweetDraft[];
  setTweets: (tweets: TweetDraft[]) => void;
  draftId: string | null | undefined;
  bridgeLoadedRef: MutableRefObject<boolean>;
  router: AppRouter;
  t: Translator;
}

/**
 * Owns the composer's draft-persistence lifecycle: localStorage autosave (2s
 * debounce), the restore banner, the "auto-saved" label delay, the
 * beforeunload guard, and the SPA navigation guard that intercepts router.push.
 * Behavior is identical to the inline implementation it replaced.
 */
export function useComposerDrafts({
  tweets,
  setTweets,
  draftId,
  bridgeLoadedRef,
  router,
  t,
}: UseComposerDraftsArgs) {
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  // P0-A: Delay showing the saved label by 5s to avoid "just now" appearing prematurely
  const [showSavedLabel, setShowSavedLabel] = useState(false);
  // Draft restore banner state
  const [pendingDraftRestore, setPendingDraftRestore] = useState<TweetDraft[] | null>(null);
  const [confirmNavDialog, setConfirmNavDialog] = useState(false);
  const [pendingNavHref, setPendingNavHref] = useState<string | null>(null);

  // Auto-save restore check - show banner instead of auto-restoring
  useEffect(() => {
    if (draftId) return; // Draft will be loaded from API — skip localStorage restore
    if (bridgeLoadedRef.current) return; // Bridge content loaded — don't show banner
    const saved = localStorage.getItem("astra-post-drafts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Only show banner if we are at default state or empty
          if (tweets.length === 1 && tweets[0]?.content === "" && tweets[0]?.media.length === 0) {
            setPendingDraftRestore(parsed);
          }
        }
      } catch (e) {
        clientLogger.error("Failed to load drafts", {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const acceptDraftRestore = () => {
    if (pendingDraftRestore) {
      setTweets(pendingDraftRestore);
      toast.success(t("toast.draft_restored"));
      setPendingDraftRestore(null);
    }
  };

  const discardDraftRestore = () => {
    localStorage.removeItem("astra-post-drafts");
    setPendingDraftRestore(null);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      // Strip uploading placeholders before persisting so reloads don't show ghost items
      const saveable = serializeDraftsForSave(tweets);
      if (!draftsHaveContent(saveable)) {
        localStorage.removeItem("astra-post-drafts");
        return;
      }
      localStorage.setItem("astra-post-drafts", JSON.stringify(saveable));
      setLastSavedAt(new Date());
    }, 2000);
    return () => clearTimeout(timeout);
  }, [tweets]);

  // P0-A: Only show the "Auto-saved" label after a 5s delay to avoid premature "just now"
  useEffect(() => {
    if (!lastSavedAt) {
      setShowSavedLabel(false);
      return;
    }
    setShowSavedLabel(false);
    const timer = setTimeout(() => setShowSavedLabel(true), 5000);
    return () => clearTimeout(timer);
  }, [lastSavedAt]);

  // P0-E + P2-D: Warn user before closing tab with unsaved content OR active uploads
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const hasUnsavedContent = tweets.some((tw) => tw.content.trim().length > 0);
      const hasUploadingMedia = tweets.some((tw) => tw.media.some((m) => m.uploading));
      if (hasUnsavedContent || hasUploadingMedia) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [tweets]);

  // UA-A13: Warn user before SPA navigation away mid-draft
  // Store a ref to the original router.push to intercept calls
  const originalRouterPush = useRef(router.push);

  useEffect(() => {
    const hasUnsavedContent = tweets.some((tw) => tw.content.trim().length > 0);
    const hasUploadingMedia = tweets.some((tw) => tw.media.some((m) => m.uploading));
    const isDrafty = hasUnsavedContent || hasUploadingMedia;

    if (!isDrafty) return;

    // Override router.push to check for unsaved content before navigation
    const wrappedPush = async (href: string) => {
      // Don't warn if navigating to the same page or within compose
      if (href.startsWith("/dashboard/compose")) {
        return originalRouterPush.current(href);
      }

      setConfirmNavDialog(true);
      setPendingNavHref(href);
      return undefined;
    };

    // Monkey-patch the router.push method
    (router.push as unknown) = wrappedPush;

    // Capture the original push in this effect scope to avoid stale ref in cleanup
    const originalPush = originalRouterPush.current;

    return () => {
      // Restore original push
      (router.push as unknown) = originalPush;
    };
  }, [tweets, router]);

  return {
    lastSavedAt,
    showSavedLabel,
    pendingDraftRestore,
    acceptDraftRestore,
    discardDraftRestore,
    confirmNavDialog,
    setConfirmNavDialog,
    pendingNavHref,
    setPendingNavHref,
  };
}
