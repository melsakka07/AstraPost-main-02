"use client";

import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  useEffect,
  useState,
} from "react";
import type { useSearchParams } from "next/navigation";
import type { ComposerPayload } from "@/lib/composer-bridge";
import type { TweetDraft } from "./composer-types";

type SourceAttribution = { handle?: string; url?: string; label?: string } | null;
type CalendarMeta = { tone: string; topic: string } | null;

interface UseComposerBridgeArgs {
  draftId: string | null | undefined;
  searchParams: ReturnType<typeof useSearchParams>;
  setTweets: (tweets: TweetDraft[]) => void;
  bridgeLoadedRef: MutableRefObject<boolean>;
}

interface UseComposerBridgeResult {
  sourceAttribution: SourceAttribution;
  setSourceAttribution: Dispatch<SetStateAction<SourceAttribution>>;
  calendarMeta: CalendarMeta;
  setCalendarMeta: Dispatch<SetStateAction<CalendarMeta>>;
}

/**
 * Reads content injected by AI tool pages via sessionStorage or the ?prefill
 * URL param. Priority order:
 *   1. composer_payload  (AI Writer, Affiliate — multi-tweet array)
 *   2. inspiration_tweets (Inspiration page — adapted tweet array)
 *   3. ?prefill=<text>   (Calendar, Reply — single tweet string)
 * Sets bridgeLoadedRef so the localStorage auto-save restore doesn't overwrite
 * content that was just injected. Behavior is identical to the inline
 * implementation it replaced.
 */
export function useComposerBridge({
  draftId,
  searchParams,
  setTweets,
  bridgeLoadedRef,
}: UseComposerBridgeArgs): UseComposerBridgeResult {
  // W4: Source attribution from Inspiration page / AI tools
  const [sourceAttribution, setSourceAttribution] = useState<SourceAttribution>(null);
  // W5: Calendar metadata hint (tone + topic) from Content Calendar page
  const [calendarMeta, setCalendarMeta] = useState<CalendarMeta>(null);

  // One-time mount hydration from sessionStorage / URL params (an external
  // store), so the synchronous setState calls in this effect are intentional.
  useEffect(() => {
    if (draftId) return; // Hard draft from URL takes highest priority

    // 1. composer_payload (AI Writer, Affiliate, Hashtag Generator)
    const payloadStr = sessionStorage.getItem("composer_payload");
    if (payloadStr) {
      try {
        const payload = JSON.parse(payloadStr) as ComposerPayload;
        if (Array.isArray(payload.tweets) && payload.tweets.length > 0) {
          const firstTweetImage = payload.firstTweetImage;
          setTweets(
            payload.tweets.map((c, i) => ({
              id: Math.random().toString(36).substr(2, 9),
              content: c,
              media:
                i === 0 && firstTweetImage?.url
                  ? [
                      {
                        url: firstTweetImage.url,
                        mimeType: "image/png",
                        fileType: "image" as const,
                        size: 0,
                      },
                    ]
                  : [],
            }))
          );
          // Source attribution for AI tools
          if (payload.source === "pdf-to-thread") {
            setSourceAttribution({ label: "PDF → Thread" });
          } else if (payload.source === "youtube-to-thread") {
            setSourceAttribution({ label: "YouTube → Thread" });
          }
          bridgeLoadedRef.current = true;
          sessionStorage.removeItem("composer_payload");
          return;
        }
      } catch {
        // Malformed payload — fall through
      }
    }

    // 2. inspiration_tweets (Inspiration page)
    const inspirationStr = sessionStorage.getItem("inspiration_tweets");
    if (inspirationStr) {
      try {
        // W4: Read source attribution before removing from storage
        const attributionStr = sessionStorage.getItem("inspiration_attribution");
        if (attributionStr) {
          try {
            setSourceAttribution(JSON.parse(attributionStr) as { handle: string; url: string });
          } catch {}
          sessionStorage.removeItem("inspiration_attribution");
        }

        const inspirationTweets = JSON.parse(inspirationStr) as string[];
        if (Array.isArray(inspirationTweets) && inspirationTweets.length > 0) {
          setTweets(
            inspirationTweets.map((c) => ({
              id: Math.random().toString(36).substr(2, 9),
              content: c,
              media: [],
            }))
          );
          bridgeLoadedRef.current = true;
          sessionStorage.removeItem("inspiration_tweets");
          sessionStorage.removeItem("inspiration_source_id");
          return;
        }
      } catch {
        // Malformed — fall through
      }
    }

    // 3. ?prefill=<text> URL param (Calendar, Reply Suggester)
    const prefill = searchParams?.get("prefill");
    if (prefill) {
      setTweets([{ id: "1", content: prefill, media: [] }]);
      bridgeLoadedRef.current = true;
      // W5: Read calendar metadata (tone + topic) passed from Content Calendar
      const calendarTone = searchParams?.get("tone");
      const calendarTopic = searchParams?.get("topic");
      if (calendarTone || calendarTopic) {
        setCalendarMeta({ tone: calendarTone ?? "", topic: calendarTopic ?? "" });
      }
      // Remove the param without a navigation so Back still works
      window.history.replaceState(null, "", "/dashboard/compose");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { sourceAttribution, setSourceAttribution, calendarMeta, setCalendarMeta };
}
