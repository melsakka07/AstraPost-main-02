"use client";

import {
  XThreadPreview as SharedXThreadPreview,
  type ThreadTweet,
} from "@/components/dashboard/x-thread-preview";
import type { AgenticTweet } from "@/lib/ai/agentic-types";

interface XThreadPreviewProps {
  tweets: AgenticTweet[];
  username?: string | undefined;
  profileImageUrl?: string | null | undefined;
}

function toThreadTweets(tweets: AgenticTweet[]): ThreadTweet[] {
  return tweets.map((t) => ({
    content: t.text,
    charCount: t.charCount,
    hashtags: t.hashtags,
    ...(t.imageUrl ? { media: [{ url: t.imageUrl, fileType: "image" as const }] } : {}),
  }));
}

export function XThreadPreview({ tweets, username, profileImageUrl }: XThreadPreviewProps) {
  return (
    <SharedXThreadPreview
      tweets={toThreadTweets(tweets)}
      account={{
        username: username ?? "",
        ...(profileImageUrl != null ? { avatarUrl: profileImageUrl } : {}),
      }}
    />
  );
}
