"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("queue");
  const [open, setOpen] = useState(false);

  if (tweets.length <= 1) return null;

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground h-6 gap-1 px-0 text-xs hover:bg-transparent"
        aria-expanded={open}
        aria-label={open ? t("view_thread") : t("view_thread")}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" />
            {t("view_thread")}
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" />
            {t("view_thread")}
          </>
        )}
      </Button>

      {open && (
        <ol className="border-muted mt-3 space-y-3 border-l-2 pl-4">
          {tweets.slice(1).map((tweet, idx) => (
            <li key={tweet.id} className="relative">
              <span className="bg-muted text-muted-foreground absolute top-0.5 -left-6 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium">
                {idx + 2}
              </span>
              <p
                className={`${isCompact ? "line-clamp-3 text-sm" : "line-clamp-4"} break-words whitespace-pre-wrap`}
              >
                {tweet.content ?? (
                  <span className="text-muted-foreground/60 italic">Empty tweet</span>
                )}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
