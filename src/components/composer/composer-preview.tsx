"use client";

import Image from "next/image";
import { BadgeCheck, MessageCircle, Repeat2, Heart, BarChart3, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types (mirrors composer-types.ts for backward-compatible inline definitions)
// ---------------------------------------------------------------------------

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  images?: string[];
  siteName?: string;
}

interface TweetDraft {
  id: string;
  content: string;
  media: Array<{
    url: string;
    mimeType: string;
    fileType: "image" | "video" | "gif";
    size: number;
    uploading?: boolean;
    placeholderId?: string;
  }>;
  linkPreview?: LinkPreview | null;
}

interface ComposerPreviewProps {
  tweets: TweetDraft[];
  previewTweet: TweetDraft | null;
  userImage?: string | null;
  userName: string;
  userHandle: string;

  session?: any;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name[0]?.toUpperCase() || "U";
}

function formatHandle(handle: string): string {
  if (!handle) return "@user";
  return handle.startsWith("@") ? handle : `@${handle}`;
}

function hasUploading(media: TweetDraft["media"]): boolean {
  return media.some((m) => m.uploading === true);
}

// ---------------------------------------------------------------------------
// Internal sub-components
// ---------------------------------------------------------------------------

function TweetAvatar({ src, name, size }: { src?: string | null; name: string; size: 40 | 48 }) {
  const dimension = size === 48 ? "h-12 w-12" : "h-10 w-10";
  return (
    <div className={cn("bg-muted relative shrink-0 overflow-hidden rounded-full", dimension)}>
      {src ? (
        <Image src={src} alt={name} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <div className="bg-primary text-primary-foreground flex h-full w-full items-center justify-center text-sm font-bold">
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}

function TweetHeader({
  userName,
  userHandle,
  tweetNumber,
  totalTweets,
}: {
  userName: string;
  userHandle: string;
  tweetNumber?: number;
  totalTweets?: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="truncate text-sm font-bold" dir="auto">
        {userName || "User"}
      </span>
      <BadgeCheck className="text-info-11 h-4 w-4 shrink-0" aria-label="Verified account" />
      <span className="text-muted-foreground truncate text-sm" dir="auto">
        {formatHandle(userHandle)}
      </span>
      <span className="text-muted-foreground text-sm select-none">&middot;</span>
      <span className="text-muted-foreground shrink-0 text-sm select-none">now</span>
      {tweetNumber != null && totalTweets != null && totalTweets > 1 && (
        <span className="text-muted-foreground/60 ml-auto shrink-0 text-xs">
          {tweetNumber}/{totalTweets}
        </span>
      )}
    </div>
  );
}

function TweetContent({ text }: { text: string }) {
  const t = useTranslations("compose");
  if (!text) {
    return (
      <p className="text-muted-foreground/60 text-sm whitespace-pre-wrap" dir="auto">
        {t("preview_placeholder")}
      </p>
    );
  }
  return (
    <p className="text-sm break-words whitespace-pre-wrap" dir="auto">
      {text}
    </p>
  );
}

function MediaUploadingSkeleton({ count }: { count: number }) {
  if (count === 1) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }
  const gridCols = count === 2 ? "grid-cols-2" : "grid-cols-2";
  return (
    <div className={cn("grid gap-0.5 overflow-hidden rounded-2xl", gridCols)}>
      {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full" />
      ))}
    </div>
  );
}

function TweetMediaGrid({ media }: { media: TweetDraft["media"] }) {
  const items = media.filter((m) => m.url);
  if (items.length === 0) return null;

  if (hasUploading(media)) {
    return (
      <div className="mt-2">
        <MediaUploadingSkeleton count={media.length} />
      </div>
    );
  }

  const count = items.length;

  // 1 image: full-width, max-h-72, rounded-2xl
  if (count === 1) {
    const item = items[0]!;
    const isVideo = item.fileType === "video" || item.fileType === "gif";
    return (
      <div className="mt-2">
        <div className="border-border relative max-h-72 w-full overflow-hidden rounded-2xl border">
          <Image
            src={item.url}
            alt="Media preview"
            width={600}
            height={400}
            className="h-auto w-full object-cover"
            style={{ maxHeight: "288px" }}
          />
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60">
                <Play className="h-5 w-5 text-white" fill="white" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2 images: side-by-side grid
  if (count === 2) {
    return (
      <div className="border-border mt-2 grid grid-cols-2 gap-0.5 overflow-hidden rounded-2xl border">
        {items.map((item) => (
          <div key={item.url} className="relative aspect-square">
            <Image
              src={item.url}
              alt="Media preview"
              fill
              sizes="(max-width: 640px) 50vw, 200px"
              className="object-cover"
            />
            {(item.fileType === "video" || item.fileType === "gif") && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60">
                  <Play className="h-4 w-4 text-white" fill="white" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // 3 images: 1 large top (span 2 cols) + 2 bottom side-by-side
  if (count === 3) {
    const [first, second, third] = items;
    return (
      <div className="border-border mt-2 grid grid-cols-2 gap-0.5 overflow-hidden rounded-2xl border">
        <div className="relative col-span-2 aspect-[2/1]">
          <Image
            src={first!.url}
            alt="Media preview"
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className="object-cover"
          />
          {(first!.fileType === "video" || first!.fileType === "gif") && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60">
                <Play className="h-4 w-4 text-white" fill="white" />
              </div>
            </div>
          )}
        </div>
        <div className="relative aspect-square">
          <Image
            src={second!.url}
            alt="Media preview"
            fill
            sizes="(max-width: 640px) 50vw, 200px"
            className="object-cover"
          />
          {(second!.fileType === "video" || second!.fileType === "gif") && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60">
                <Play className="h-4 w-4 text-white" fill="white" />
              </div>
            </div>
          )}
        </div>
        <div className="relative aspect-square">
          <Image
            src={third!.url}
            alt="Media preview"
            fill
            sizes="(max-width: 640px) 50vw, 200px"
            className="object-cover"
          />
          {(third!.fileType === "video" || third!.fileType === "gif") && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60">
                <Play className="h-4 w-4 text-white" fill="white" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4 images: 2x2 grid
  return (
    <div className="border-border mt-2 grid grid-cols-2 gap-0.5 overflow-hidden rounded-2xl border">
      {items.slice(0, 4).map((item) => (
        <div key={item.url} className="relative aspect-square">
          <Image
            src={item.url}
            alt="Media preview"
            fill
            sizes="(max-width: 640px) 50vw, 200px"
            className="object-cover"
          />
          {(item.fileType === "video" || item.fileType === "gif") && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60">
                <Play className="h-4 w-4 text-white" fill="white" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TweetLinkPreviewCard({ link }: { link: LinkPreview }) {
  return (
    <div className="border-border mt-2 overflow-hidden rounded-2xl border">
      {link.images?.[0] && (
        <div className="relative h-48 w-full">
          <Image
            src={link.images[0]}
            alt={link.title || "Link preview"}
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className="object-cover"
          />
        </div>
      )}
      <div className="space-y-1 p-3">
        {link.siteName && <p className="text-muted-foreground text-xs">{link.siteName}</p>}
        {link.title && <p className="line-clamp-1 text-sm font-medium">{link.title}</p>}
        {link.description && (
          <p className="text-muted-foreground line-clamp-2 text-xs">{link.description}</p>
        )}
      </div>
    </div>
  );
}

function TweetEngagementRow() {
  return (
    <div className="text-muted-foreground mt-2 flex max-w-md items-center justify-between select-none">
      {/* Replies */}
      <div className="flex items-center gap-1">
        <MessageCircle className="h-4 w-4" />
        <span className="text-xs">0</span>
      </div>
      {/* Reposts */}
      <div className="flex items-center gap-1">
        <Repeat2 className="h-4 w-4" />
        <span className="text-xs">0</span>
      </div>
      {/* Likes */}
      <div className="flex items-center gap-1">
        <Heart className="h-4 w-4" />
        <span className="text-xs">0</span>
      </div>
      {/* Views */}
      <div className="flex items-center gap-1">
        <BarChart3 className="h-4 w-4" />
        <span className="text-xs">0</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single tweet card (reused in both single and thread views)
// ---------------------------------------------------------------------------

function TweetCard({
  tweet,
  userName,
  userHandle,
  userImage,
  avatarSize,
  tweetNumber,
  totalTweets,
}: {
  tweet: TweetDraft;
  userName: string;
  userHandle: string;
  userImage?: string | null;
  avatarSize: 40 | 48;
  tweetNumber?: number;
  totalTweets?: number;
}) {
  return (
    <div className="flex gap-3">
      <TweetAvatar
        {...(userImage !== undefined && { src: userImage })}
        name={userName}
        size={avatarSize}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <TweetHeader
          userName={userName}
          userHandle={userHandle}
          {...(tweetNumber !== undefined && { tweetNumber })}
          {...(totalTweets !== undefined && { totalTweets })}
        />
        <TweetContent text={tweet.content} />
        <TweetMediaGrid media={tweet.media} />
        {tweet.linkPreview && !tweet.media?.length && (
          <TweetLinkPreviewCard link={tweet.linkPreview} />
        )}
        <TweetEngagementRow />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Thread connector line between stacked tweets
// ---------------------------------------------------------------------------

function ThreadConnector() {
  return (
    <div className="flex gap-3">
      {/* Left gutter matching avatar width */}
      <div className="flex w-10 shrink-0 flex-col items-center">
        <div className="bg-border min-h-3 w-0.5 flex-1" />
      </div>
      {/* Right gutter: empty — content goes in the next tweet card */}
      <div className="min-w-0 flex-1" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

export function ComposerPreview({
  tweets,
  previewTweet,
  userImage,
  userName,
  userHandle,
}: ComposerPreviewProps) {
  const t = useTranslations("compose");
  const isThread = tweets.length > 1;
  const displayTweet = tweets.length <= 1 ? (previewTweet ?? null) : null;

  return (
    <div className="space-y-2 px-3 py-3 sm:space-y-3 sm:px-6 sm:py-5">
      {/* Header row */}
      <div className="mb-1.5 flex items-center sm:mb-2">
        <p className="text-muted-foreground/70 text-xs font-medium">{t("preview_label")}</p>
      </div>

      {/* Preview card */}
      <div className="bg-card border-border rounded-xl border p-3 sm:p-4">
        {!isThread ? (
          /* ---- Single tweet ---- */
          displayTweet ? (
            <TweetCard
              tweet={displayTweet}
              userName={userName}
              userHandle={userHandle}
              {...(userImage !== undefined && { userImage })}
              avatarSize={48}
            />
          ) : (
            /* Empty state: no tweet yet */
            <div className="flex gap-3">
              <TweetAvatar
                {...(userImage !== undefined && { src: userImage })}
                name={userName}
                size={48}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <TweetHeader userName={userName} userHandle={userHandle} />
                <p className="text-muted-foreground/60 text-sm whitespace-pre-wrap" dir="auto">
                  {t("preview_placeholder")}
                </p>
                <TweetEngagementRow />
              </div>
            </div>
          )
        ) : (
          /* ---- Thread ---- */
          <>
            {/* Desktop: stacked with connector lines */}
            <div className="hidden sm:block">
              {tweets.map((tweet, i) => (
                <div key={tweet.id}>
                  {i > 0 && <ThreadConnector />}
                  <TweetCard
                    tweet={tweet}
                    userName={userName}
                    userHandle={userHandle}
                    {...(userImage !== undefined && { userImage })}
                    avatarSize={40}
                    tweetNumber={i + 1}
                    totalTweets={tweets.length}
                  />
                </div>
              ))}
            </div>

            {/* Mobile: horizontal carousel with snap points */}
            <div
              className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 sm:hidden"
              role="region"
              aria-label="Thread preview carousel"
            >
              {tweets.map((tweet, i) => (
                <div key={tweet.id} className="w-[85vw] max-w-[380px] shrink-0 snap-center">
                  <TweetCard
                    tweet={tweet}
                    userName={userName}
                    userHandle={userHandle}
                    {...(userImage !== undefined && { userImage })}
                    avatarSize={40}
                    tweetNumber={i + 1}
                    totalTweets={tweets.length}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
