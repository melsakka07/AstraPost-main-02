"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Verified,
  MessageCircle,
  Repeat2,
  Heart,
  Eye,
  ChevronDown,
  ChevronUp,
  Play,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Tweet } from "@/lib/services/tweet-importer";
import { cn } from "@/lib/utils";

interface ImportedTweetCardProps {
  tweet: Tweet;
  showThreadContext?: boolean;
  parentTweets?: Tweet[];
  topReplies?: Tweet[];
  quotedTweet?: Tweet | undefined;
  onToggleThread?: () => void;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const diff = now.getTime() - dateObj.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return "now";
}

function highlightEntities(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Create a combined pattern for URLs, mentions, and hashtags
  const combinedPattern = /https?:\/\/[^\s]+|@(\w+)|#(\w+)/g;

  while ((match = combinedPattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const matchedText = match[0];

    if (matchedText.startsWith("http")) {
      parts.push(
        <Link
          key={`url-${match.index}`}
          href={matchedText}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {matchedText}
        </Link>
      );
    } else if (matchedText.startsWith("@")) {
      parts.push(
        <span key={`mention-${match.index}`} className="text-primary font-medium">
          {matchedText}
        </span>
      );
    } else if (matchedText.startsWith("#")) {
      parts.push(
        <span key={`hashtag-${match.index}`} className="text-primary font-medium">
          {matchedText}
        </span>
      );
    }

    lastIndex = combinedPattern.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function TweetContent({ tweet, isReply = false }: { tweet: Tweet; isReply?: boolean }) {
  return (
    <div className={cn("flex gap-2 sm:gap-3", isReply && "ml-8 sm:ml-12")}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="bg-muted h-10 w-10 overflow-hidden rounded-full sm:h-12 sm:w-12">
          {tweet.author.avatarUrl ? (
            <Image
              src={tweet.author.avatarUrl}
              alt={tweet.author.name}
              width={48}
              height={48}
              className="object-cover"
            />
          ) : (
            <div className="text-muted-foreground flex h-full w-full items-center justify-center text-base font-medium sm:text-lg">
              {tweet.author.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
          <span className="text-foreground truncate text-sm font-bold sm:text-base">
            {tweet.author.name}
          </span>
          {tweet.author.verified && (
            <Verified className="text-primary fill-primary h-3.5 w-3.5 sm:h-4 sm:w-4" />
          )}
          <span className="text-muted-foreground text-xs sm:text-sm">@{tweet.author.username}</span>
          <span className="text-muted-foreground text-xs sm:text-sm">·</span>
          <span className="text-muted-foreground text-xs sm:text-sm">
            {formatRelativeTime(tweet.createdAt)}
          </span>
        </div>

        {/* Tweet Text */}
        <div className="text-foreground mt-1 text-sm leading-normal break-words whitespace-pre-wrap sm:text-[15px]">
          {highlightEntities(tweet.text)}
        </div>

        {/* Media */}
        {tweet.media.length > 0 && (
          <div className="mt-3 grid gap-2">
            {tweet.media.length === 1 && (
              <div className="border-border relative max-w-md overflow-hidden rounded-2xl border">
                {tweet.media[0]?.type === "video" || tweet.media[0]?.type === "gif" ? (
                  <a
                    href={`https://x.com/${tweet.author.username}/status/${tweet.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative block aspect-video w-full cursor-pointer"
                  >
                    <Image
                      src={tweet.media[0]?.thumbnailUrl ?? tweet.media[0]?.url ?? ""}
                      alt="Video thumbnail"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg">
                        <Play className="ml-1 h-8 w-8 text-gray-900" fill="currentColor" />
                      </div>
                    </div>
                    <div className="absolute right-2 bottom-2 flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-xs text-white">
                      <ExternalLink className="h-3 w-3" />
                      <span>View on X</span>
                    </div>
                  </a>
                ) : (
                  <div className="relative aspect-video w-full">
                    <Image
                      src={tweet.media[0]?.url ?? ""}
                      alt="Tweet media"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                )}
              </div>
            )}
            {tweet.media.length === 2 && (
              <div className="grid max-w-md grid-cols-2 gap-2">
                {tweet.media.map((media, i) => (
                  <div
                    key={i}
                    className="border-border relative aspect-square overflow-hidden rounded-2xl border"
                  >
                    <Image
                      src={media.url}
                      alt={`Tweet media ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 300px"
                    />
                  </div>
                ))}
              </div>
            )}
            {tweet.media.length === 3 && (
              <div className="grid max-w-md grid-cols-2 gap-2">
                {tweet.media.slice(0, 2).map((media, i) => (
                  <div
                    key={i}
                    className="border-border relative aspect-square overflow-hidden rounded-2xl border"
                  >
                    <Image
                      src={media.url}
                      alt={`Tweet media ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 300px"
                    />
                  </div>
                ))}
                {tweet.media[2] && (
                  <div className="border-border relative aspect-square overflow-hidden rounded-2xl border">
                    <Image
                      src={tweet.media[2].url}
                      alt="Tweet media 3"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 300px"
                    />
                  </div>
                )}
              </div>
            )}
            {tweet.media.length >= 4 && (
              <div className="grid max-w-md grid-cols-2 gap-2">
                {tweet.media.map((media, i) => (
                  <div
                    key={i}
                    className="border-border relative aspect-square overflow-hidden rounded-2xl border"
                  >
                    <Image
                      src={media.url}
                      alt={`Tweet media ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 300px"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Metrics */}
        <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs sm:mt-3 sm:gap-5 sm:text-sm">
          <div className="hover:text-primary flex items-center gap-1 transition-colors sm:gap-1.5">
            <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>{formatNumber(tweet.metrics.replies)}</span>
          </div>
          <div className="hover:text-primary flex items-center gap-1 transition-colors sm:gap-1.5">
            <Repeat2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>{formatNumber(tweet.metrics.retweets)}</span>
          </div>
          <div className="hover:text-primary flex items-center gap-1 transition-colors sm:gap-1.5">
            <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>{formatNumber(tweet.metrics.likes)}</span>
          </div>
          <div className="hover:text-primary flex items-center gap-1 transition-colors sm:gap-1.5">
            <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>{formatNumber(tweet.metrics.impressions)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ImportedTweetCard({
  tweet,
  showThreadContext = false,
  parentTweets = [],
  topReplies = [],
  quotedTweet,
  onToggleThread,
}: ImportedTweetCardProps) {
  return (
    <Card className="border-border">
      <CardContent className="p-3 sm:p-4">
        {/* Quoted Tweet */}
        {quotedTweet && (
          <div className="border-border mb-3 border-b pb-3 sm:mb-4 sm:pb-4">
            <div className="text-muted-foreground mb-1.5 text-[10px] sm:mb-2 sm:text-xs">
              Quoted Tweet
            </div>
            <TweetContent tweet={quotedTweet} />
          </div>
        )}

        {/* Parent Tweets (Thread Context) */}
        {showThreadContext && parentTweets.length > 0 && (
          <div className="border-border mb-3 space-y-3 border-b pb-3 sm:mb-4 sm:space-y-4 sm:pb-4">
            <div className="text-muted-foreground text-[10px] sm:text-xs">Thread Context</div>
            {[...parentTweets].reverse().map((parentTweet) => (
              <TweetContent key={parentTweet.id} tweet={parentTweet} />
            ))}
          </div>
        )}

        {/* Main Tweet */}
        <TweetContent tweet={tweet} />

        {/* Thread Toggle */}
        {(parentTweets.length > 0 || topReplies.length > 0) && (
          <div className="border-border mt-3 border-t pt-3 sm:mt-4 sm:pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleThread}
              className="text-muted-foreground hover:text-foreground h-8 text-xs sm:h-9 sm:text-sm"
            >
              {showThreadContext ? (
                <>
                  <ChevronUp className="mr-0.5 h-3.5 w-3.5 sm:mr-1 sm:h-4 sm:w-4" />
                  Hide Thread
                </>
              ) : (
                <>
                  <ChevronDown className="mr-0.5 h-3.5 w-3.5 sm:mr-1 sm:h-4 sm:w-4" />
                  View Thread {parentTweets.length > 0 && `(${parentTweets.length})`}
                  {topReplies.length > 0 &&
                    ` · ${topReplies.length} repl${topReplies.length > 1 ? "ies" : "y"}`}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Top Replies (shown when thread is expanded) */}
        {showThreadContext && topReplies.length > 0 && (
          <div className="border-border mt-3 space-y-3 border-t pt-3 sm:mt-4 sm:space-y-4 sm:pt-4">
            <div className="text-muted-foreground text-[10px] sm:text-xs">Top Replies</div>
            {topReplies.slice(0, 3).map((reply) => (
              <TweetContent key={reply.id} tweet={reply} isReply />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
