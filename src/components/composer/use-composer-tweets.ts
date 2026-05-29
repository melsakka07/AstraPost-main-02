"use client";

import { type Dispatch, type SetStateAction } from "react";
import { type DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { LinkPreview, TweetDraft } from "@/components/composer/composer-types";
import { applyNumbering, isThreadNumbered } from "@/components/composer/composer-utils";

interface UseComposerTweetsArgs {
  tweets: TweetDraft[];
  setTweets: Dispatch<SetStateAction<TweetDraft[]>>;
  setPreviewIndex: Dispatch<SetStateAction<number>>;
  setGeneratedHashtags: Dispatch<SetStateAction<string[]>>;
  aiAddNumbering: boolean;
}

export function useComposerTweets({
  tweets,
  setTweets,
  setPreviewIndex,
  setGeneratedHashtags,
  aiAddNumbering,
}: UseComposerTweetsArgs) {
  const t = useTranslations("compose");

  const addTweet = () => {
    // P3-B: When a thread reaches 3+ tweets and auto-numbering is on, apply 1/N prefixes
    const nextTweets: TweetDraft[] = [
      ...tweets,
      { id: Math.random().toString(36).substr(2, 9), content: "", media: [] },
    ];
    setTweets(aiAddNumbering && nextTweets.length >= 3 ? applyNumbering(nextTweets) : nextTweets);
  };

  const removeTweet = (id: string) => {
    if (tweets.length === 1) return;
    const previousTweets = [...tweets];
    const nextTweets = tweets.filter((tw) => tw.id !== id);
    setTweets(nextTweets);
    setPreviewIndex((prev) => Math.min(prev, nextTweets.length - 1));
    toast(t("toast.tweet_removed"), {
      action: {
        label: t("toast.undo"),
        onClick: () => {
          setTweets(previousTweets);
          setPreviewIndex((prev) => Math.min(prev, previousTweets.length - 1));
        },
      },
    });
  };

  const clearTweet = (id: string) => {
    const previous = tweets.find((tw) => tw.id === id);
    if (!previous || (previous.content === "" && previous.media.length === 0)) return;
    setTweets((prev) => prev.map((tw) => (tw.id === id ? { ...tw, content: "", media: [] } : tw)));
    setGeneratedHashtags([]);
    toast("Tweet cleared", {
      action: {
        label: t("toast.undo"),
        onClick: () => setTweets((prev) => prev.map((tw) => (tw.id === id ? previous : tw))),
      },
    });
  };

  const moveTweet = (fromIndex: number, toIndex: number) => {
    setTweets((items) => arrayMove(items, fromIndex, toIndex));
  };

  const updateTweetPreview = (id: string, preview: LinkPreview | null) => {
    setTweets(tweets.map((tw) => (tw.id === id ? { ...tw, linkPreview: preview } : tw)));
  };

  const removeTweetMedia = (id: string, url: string) => {
    setTweets(
      tweets.map((tw) =>
        tw.id === id ? { ...tw, media: tw.media.filter((m) => m.url !== url) } : tw
      )
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTweets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // True when every non-empty tweet starts with the N/M prefix pattern
  const isTweetsNumbered = isThreadNumbered(tweets);

  return {
    addTweet,
    removeTweet,
    clearTweet,
    moveTweet,
    updateTweetPreview,
    removeTweetMedia,
    handleDragEnd,
    isTweetsNumbered,
  };
}
