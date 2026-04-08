"use client";

import Image from "next/image";
import Link from "next/link";
import { Verified, MessageCircle, Repeat2, Heart, Eye, ChevronDown, ChevronUp, Play, ExternalLink } from "lucide-react";
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
  const dateObj = typeof date === 'string' ? new Date(date) : date;
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
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted overflow-hidden">
          {tweet.author.avatarUrl ? (
            <Image
              src={tweet.author.avatarUrl}
              alt={tweet.author.name}
              width={48}
              height={48}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-base sm:text-lg font-medium">
              {tweet.author.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          <span className="font-bold text-foreground truncate text-sm sm:text-base">{tweet.author.name}</span>
          {tweet.author.verified && (
            <Verified className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary fill-primary" />
          )}
          <span className="text-muted-foreground text-xs sm:text-sm">@{tweet.author.username}</span>
          <span className="text-muted-foreground text-xs sm:text-sm">·</span>
          <span className="text-muted-foreground text-xs sm:text-sm">{formatRelativeTime(tweet.createdAt)}</span>
        </div>

        {/* Tweet Text */}
        <div className="mt-1 text-sm sm:text-[15px] leading-normal whitespace-pre-wrap break-words text-foreground">
          {highlightEntities(tweet.text)}
        </div>

        {/* Media */}
        {tweet.media.length > 0 && (
          <div className="mt-3 grid gap-2">
            {tweet.media.length === 1 && (
              <div className="relative rounded-2xl overflow-hidden border border-border max-w-md">
                {(tweet.media[0]?.type === "video" || tweet.media[0]?.type === "gif") ? (
                  <a
                    href={`https://x.com/${tweet.author.username}/status/${tweet.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative aspect-video w-full group cursor-pointer"
                  >
                    <Image
                      src={tweet.media[0]?.thumbnailUrl ?? tweet.media[0]?.url ?? ""}
                      alt="Video thumbnail"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                      <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        <Play className="h-8 w-8 text-gray-900 ml-1" fill="currentColor" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
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
              <div className="grid grid-cols-2 gap-2 max-w-md">
                {tweet.media.map((media, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-border">
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
              <div className="grid grid-cols-2 gap-2 max-w-md">
                {tweet.media.slice(0, 2).map((media, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-border">
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
                  <div className="relative aspect-square rounded-2xl overflow-hidden border border-border">
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
              <div className="grid grid-cols-2 gap-2 max-w-md">
                {tweet.media.map((media, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-border">
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
        <div className="mt-2 sm:mt-3 flex items-center gap-3 sm:gap-5 text-muted-foreground text-xs sm:text-sm">
          <div className="flex items-center gap-1 sm:gap-1.5 hover:text-primary transition-colors">
            <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>{formatNumber(tweet.metrics.replies)}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 hover:text-primary transition-colors">
            <Repeat2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>{formatNumber(tweet.metrics.retweets)}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 hover:text-primary transition-colors">
            <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>{formatNumber(tweet.metrics.likes)}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 hover:text-primary transition-colors">
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
          <div className="mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-border">
            <div className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2">Quoted Tweet</div>
            <TweetContent tweet={quotedTweet} />
          </div>
        )}

        {/* Parent Tweets (Thread Context) */}
        {showThreadContext && parentTweets.length > 0 && (
          <div className="mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-border space-y-3 sm:space-y-4">
            <div className="text-[10px] sm:text-xs text-muted-foreground">Thread Context</div>
            {[...parentTweets].reverse().map((parentTweet) => (
              <TweetContent key={parentTweet.id} tweet={parentTweet} />
            ))}
          </div>
        )}

        {/* Main Tweet */}
        <TweetContent tweet={tweet} />

        {/* Thread Toggle */}
        {(parentTweets.length > 0 || topReplies.length > 0) && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleThread}
              className="text-muted-foreground hover:text-foreground h-8 sm:h-9 text-xs sm:text-sm"
            >
              {showThreadContext ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                  Hide Thread
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                  View Thread {parentTweets.length > 0 && `(${parentTweets.length})`}
                  {topReplies.length > 0 && ` · ${topReplies.length} repl${topReplies.length > 1 ? "ies" : "y"}`}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Top Replies (shown when thread is expanded) */}
        {showThreadContext && topReplies.length > 0 && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border space-y-3 sm:space-y-4">
            <div className="text-[10px] sm:text-xs text-muted-foreground">Top Replies</div>
            {topReplies.slice(0, 3).map((reply) => (
              <TweetContent key={reply.id} tweet={reply} isReply />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
