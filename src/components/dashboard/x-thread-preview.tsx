"use client";

import Image from "next/image";
import { XAccountAvatar } from "@/components/ai/agentic/x-account-avatar";
import { cn } from "@/lib/utils";

export interface ThreadTweet {
  content: string;
  charCount?: number;
  media?: Array<{
    url: string;
    mimeType?: string;
    fileType: "image" | "video" | "gif";
  }>;
  linkPreview?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
  } | null;
  hashtags?: string[];
}

interface XThreadPreviewProps {
  tweets: ThreadTweet[];
  account?: {
    username: string;
    displayName?: string;
    avatarUrl?: string | null;
  };
  showNumbering?: boolean;
  className?: string;
}

export function XThreadPreview({ tweets, account, showNumbering, className }: XThreadPreviewProps) {
  if (tweets.length === 0) return null;

  return (
    <div className={cn("space-y-0", className)}>
      {account && (
        <div className="mb-3">
          <XAccountAvatar username={account.username} profileImageUrl={account.avatarUrl} />
        </div>
      )}
      {tweets.map((tweet, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex shrink-0 flex-col items-center" style={{ width: 32 }}>
            <div className="bg-border h-full w-0.5" style={{ minHeight: 8 }} />
          </div>
          <div className="min-w-0 flex-1 pb-3">
            {showNumbering && tweets.length > 1 && (
              <p className="text-muted-foreground mb-1 text-[11px] font-medium">
                {i + 1}/{tweets.length}
              </p>
            )}
            <p className="text-[13px] leading-relaxed break-words whitespace-pre-wrap">
              {tweet.content}
              {tweet.hashtags && tweet.hashtags.length > 0 && (
                <span className="text-primary">
                  {" "}
                  {tweet.hashtags.map((h) => `#${h}`).join(" ")}
                </span>
              )}
            </p>
            {tweet.linkPreview && (
              <div className="border-border mt-2 overflow-hidden rounded-lg border">
                {tweet.linkPreview.image && (
                  <Image
                    src={tweet.linkPreview.image}
                    alt={tweet.linkPreview.title ?? ""}
                    width={400}
                    height={200}
                    className="max-h-40 w-full object-cover"
                  />
                )}
                <div className="p-2">
                  {tweet.linkPreview.title && (
                    <p className="text-xs font-medium">{tweet.linkPreview.title}</p>
                  )}
                  {tweet.linkPreview.description && (
                    <p className="text-muted-foreground mt-0.5 text-[11px]">
                      {tweet.linkPreview.description}
                    </p>
                  )}
                </div>
              </div>
            )}
            {tweet.media &&
              tweet.media.length > 0 &&
              tweet.media.map((m, j) => (
                <div key={j} className="border-border mt-2 overflow-hidden rounded-lg border">
                  {m.fileType === "video" ? (
                    <video src={m.url} controls className="max-h-40 w-full object-cover" />
                  ) : (
                    <Image
                      src={m.url}
                      alt=""
                      width={400}
                      height={200}
                      className="max-h-40 w-full object-cover"
                    />
                  )}
                </div>
              ))}
            {tweet.charCount !== undefined && (
              <p className="text-muted-foreground mt-1 text-[11px]">{tweet.charCount}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
