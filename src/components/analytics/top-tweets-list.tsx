"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TweetAnalyticsDrawer } from "./tweet-analytics-drawer";

interface TopTweet {
  tweetId: string;
  content: string;
  xTweetId: string;
  impressions: number | null;
  likes: number | null;
  retweets: number | null;
  replies: number | null;
}

export function TopTweetsList({ tweets, isCompact }: { tweets: TopTweet[], isCompact: boolean }) {
  const [selectedTweetId, setSelectedTweetId] = useState<string | null>(null);

  return (
    <>
      <div className={isCompact ? "space-y-2" : "space-y-3"}>
        {tweets.map((t, i) => (
          <Card 
            key={`${t.xTweetId}-${i}`} 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setSelectedTweetId(t.tweetId)}
          >
            <CardContent className={isCompact ? "space-y-2 px-4 pb-4 pt-4" : "space-y-3 pt-6"}>
              <div className="flex justify-between items-start gap-4">
                  <p className={`${isCompact ? "line-clamp-4 text-sm" : ""} whitespace-pre-wrap break-words flex-1`}>{t.content}</p>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <BarChart3 className="h-4 w-4" />
                  </Button>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span>Impressions: {(t.impressions || 0).toLocaleString()}</span>
                <span>Likes: {(t.likes || 0).toLocaleString()}</span>
                <span>Retweets: {(t.retweets || 0).toLocaleString()}</span>
                <span>Replies: {(t.replies || 0).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TweetAnalyticsDrawer 
        tweetId={selectedTweetId} 
        open={!!selectedTweetId} 
        onOpenChange={(open) => !open && setSelectedTweetId(null)} 
      />
    </>
  );
}
