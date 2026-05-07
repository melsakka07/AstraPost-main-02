"use client";

import { XAccountAvatar } from "@/components/ai/agentic/x-account-avatar";
import type { AgenticTweet } from "@/lib/ai/agentic-types";

interface XThreadPreviewProps {
  tweets: AgenticTweet[];
  username?: string | undefined;
  profileImageUrl?: string | null | undefined;
}

export function XThreadPreview({ tweets, username, profileImageUrl }: XThreadPreviewProps) {
  return (
    <div className="space-y-0">
      {/* Account header */}
      <div className="mb-3">
        <XAccountAvatar username={username ?? "you"} profileImageUrl={profileImageUrl} />
      </div>
      {/* Tweet bubbles */}
      {tweets.map((tweet, i) => (
        <div key={i} className="flex gap-3">
          {/* Connector line */}
          <div className="flex shrink-0 flex-col items-center" style={{ width: 32 }}>
            <div className="bg-border h-full w-0.5" style={{ minHeight: 8 }} />
          </div>
          {/* Tweet content */}
          <div className="min-w-0 flex-1 pb-3">
            <p className="text-[13px] leading-relaxed break-words whitespace-pre-wrap">
              {tweet.text}
              {tweet.hashtags.length > 0 && (
                <span className="text-primary">
                  {" "}
                  {tweet.hashtags.map((h) => `#${h}`).join(" ")}
                </span>
              )}
            </p>
            {tweet.imageUrl && (
              <div className="border-border mt-2 overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tweet.imageUrl}
                  alt={tweet.imagePrompt ?? ""}
                  className="max-h-40 w-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
