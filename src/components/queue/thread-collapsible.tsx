"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TweetPreview {
  id: string;
  content: string | null;
  position: number;
}

export function ThreadCollapsible({
  tweets,
  isCompact,
}: {
  tweets: TweetPreview[];
  isCompact: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (tweets.length <= 1) return null;

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-0 text-xs text-muted-foreground hover:text-foreground hover:bg-transparent gap-1"
        aria-expanded={open}
        aria-label={open ? "Collapse thread" : "Expand thread"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" />
            Collapse thread
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" />
            Show thread ({tweets.length - 1} more)
          </>
        )}
      </Button>

      {open && (
        <ol className="mt-3 space-y-3 border-l-2 border-muted pl-4">
          {tweets.slice(1).map((tweet, idx) => (
            <li key={tweet.id} className="relative">
              <span className="absolute -left-6 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                {idx + 2}
              </span>
              <p
                className={`${isCompact ? "line-clamp-3 text-sm" : "line-clamp-4"} whitespace-pre-wrap break-words`}
              >
                {tweet.content ?? (
                  <span className="italic text-muted-foreground/60">
                    Empty tweet
                  </span>
                )}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
