"use client";

import Image from "next/image";
import Link from "next/link";
import { Verified, MessageCircle, Repeat2, Heart, Eye, ChevronDown, ChevronUp } from "lucide-react";
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
    <div className={cn("flex gap-3", isReply && "ml-12")}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-muted overflow-hidden">
          {tweet.author.avatarUrl ? (
            <Image
              src={tweet.author.avatarUrl}
              alt={tweet.author.name}
              width={48}
              height={48}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg font-medium">
              {tweet.author.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-foreground truncate">{tweet.author.name}</span>
          {tweet.author.verified && (
            <Verified className="h-4 w-4 text-primary fill-primary" />
          )}
          <span className="text-muted-foreground">@{tweet.author.username}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{formatRelativeTime(tweet.createdAt)}</span>
        </div>

        {/* Tweet Text */}
        <div className="mt-1 text-[15px] leading-normal whitespace-pre-wrap break-words text-foreground">
          {highlightEntities(tweet.text)}
        </div>

        {/* Media */}
        {tweet.media.length > 0 && (
          <div className="mt-3 grid gap-2">
            {tweet.media.length === 1 && (
              <div className="relative rounded-2xl overflow-hidden border border-border max-w-md">
                {tweet.media[0]?.type === "video" || tweet.media[0]?.type === "gif" ? (
                  <video
                    src={tweet.media[0]?.url ?? ""}
                    controls
                    className="w-full"
                  />
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
        <div className="mt-3 flex items-center gap-5 text-muted-foreground text-sm">
          <div className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <MessageCircle className="h-4 w-4" />
            <span>{formatNumber(tweet.metrics.replies)}</span>
          </div>
          <div className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <Repeat2 className="h-4 w-4" />
            <span>{formatNumber(tweet.metrics.retweets)}</span>
          </div>
          <div className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <Heart className="h-4 w-4" />
            <span>{formatNumber(tweet.metrics.likes)}</span>
          </div>
          <div className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <Eye className="h-4 w-4" />
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
      <CardContent className="p-4">
        {/* Quoted Tweet */}
        {quotedTweet && (
          <div className="mb-4 pb-4 border-b border-border">
            <div className="text-xs text-muted-foreground mb-2">Quoted Tweet</div>
            <TweetContent tweet={quotedTweet} />
          </div>
        )}

        {/* Parent Tweets (Thread Context) */}
        {showThreadContext && parentTweets.length > 0 && (
          <div className="mb-4 pb-4 border-b border-border space-y-4">
            <div className="text-xs text-muted-foreground">Thread Context</div>
            {[...parentTweets].reverse().map((parentTweet) => (
              <TweetContent key={parentTweet.id} tweet={parentTweet} />
            ))}
          </div>
        )}

        {/* Main Tweet */}
        <TweetContent tweet={tweet} />

        {/* Thread Toggle */}
        {(parentTweets.length > 0 || topReplies.length > 0) && (
          <div className="mt-4 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleThread}
              className="text-muted-foreground hover:text-foreground"
            >
              {showThreadContext ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Hide Thread
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  View Thread {parentTweets.length > 0 && `(${parentTweets.length} parent${parentTweets.length > 1 ? "s" : ""})`}
                  {topReplies.length > 0 && ` · ${topReplies.length} top repl${topReplies.length > 1 ? "ies" : "y"}`}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Top Replies (shown when thread is expanded) */}
        {showThreadContext && topReplies.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border space-y-4">
            <div className="text-xs text-muted-foreground">Top Replies</div>
            {topReplies.slice(0, 3).map((reply) => (
              <TweetContent key={reply.id} tweet={reply} isReply />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
