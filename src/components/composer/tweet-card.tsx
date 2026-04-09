import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  X,
  Image as ImageIcon,
  Loader2,
  Smile,
  Wand2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Eraser,
  ListOrdered,
  AlertCircle,
} from "lucide-react";
import twitter from "twitter-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { XSubscriptionBadge, XSubscriptionTier } from "@/components/ui/x-subscription-badge";
import { useMediaQuery } from "@/hooks/use-media-query";
import { getMaxCharacterLimit, canPostLongContent } from "@/lib/services/x-subscription";
import { cn } from "@/lib/utils";
import type { EmojiClickData } from "emoji-picker-react";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

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
  linkPreview?: {
    url: string;
    title?: string;
    description?: string;
    images?: string[];
  } | null;
}

interface TweetCardProps {
  tweet: TweetDraft;
  index: number;
  totalTweets: number;
  updateTweet: (id: string, content: string) => void;
  updateTweetPreview?: ((id: string, preview: any) => void) | undefined;
  removeTweet: (id: string) => void;
  removeTweetMedia: (id: string, url: string) => void;
  triggerFileUpload: (id: string) => void;
  openAiImage?: (tweetId: string) => void;
  dragHandleProps?: any;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  suggestedHashtags?: string[];
  onHashtagClick?: (tag: string) => void;
  onClearTweet?: () => void;
  tier?: XSubscriptionTier | undefined;
  // Phase 3: Highlight target tweets when AI panel is open
  isAiTarget?: boolean;
  isTweetsNumbered?: boolean;
  onToggleNumbering?: () => void;
  onConvertToThread?: () => void;
  selectedTier?: XSubscriptionTier | undefined;
}

export function TweetCard({
  tweet,
  index,
  totalTweets,
  updateTweet,
  updateTweetPreview,
  removeTweet,
  removeTweetMedia,
  triggerFileUpload,
  openAiImage,
  dragHandleProps,
  onMoveUp,
  onMoveDown,
  isFirst,
  suggestedHashtags,
  onHashtagClick,
  onClearTweet,
  tier,
  isAiTarget = false,
  isTweetsNumbered,
  onToggleNumbering,
  onConvertToThread,
  selectedTier,
}: TweetCardProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [linkPreviewPending, setLinkPreviewPending] = useState(false);
  // P4-B: Debounced char count for screen reader announcements — only announce every 10 chars
  // to avoid flooding assistive technology on every keystroke.
  const [announcedCharCount, setAnnouncedCharCount] = useState(0);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const getCharCount = (text: string) => twitter.parseTweet(text).weightedLength;

  // Thread mode: each tweet is limited to 280 regardless of tier.
  // Single-post mode: tier determines the limit (280 for Free, 2,000 for Premium).
  const isThreadMode = totalTweets > 1;
  const maxChars = isThreadMode ? 280 : getMaxCharacterLimit(tier);
  const isOverStandardLimit = (text: string) => getCharCount(text) > 280;
  const isOverLimit = (text: string) => getCharCount(text) > maxChars;
  const charCount = getCharCount(tweet.content);
  const isPremiumSinglePost = !isThreadMode && canPostLongContent(tier);

  // Length zone label for Premium single-post mode
  const getLengthZone = () => {
    if (!isPremiumSinglePost) return null;
    if (charCount <= 280) return "Short post";
    if (charCount <= 1_000) return "Medium post";
    return "Long post";
  };

  // P4-B: Only update the announced count when it crosses a 10-char boundary,
  // or when the user is near the limit (within 20 chars) for timely warnings.
  useEffect(() => {
    const nearLimit = charCount > maxChars - 20;
    const crossed10 = Math.floor(charCount / 10) !== Math.floor(announcedCharCount / 10);
    if (nearLimit || crossed10) setAnnouncedCharCount(charCount);
  }, [charCount, maxChars, announcedCharCount]);

  const onEmojiClick = (emojiData: EmojiClickData) => {
    updateTweet(tweet.id, tweet.content + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    if (!updateTweetPreview) return;
    const urls = twitter.extractUrls(tweet.content);
    const firstUrl = urls[0];

    if (!firstUrl) {
      setLinkPreviewPending(false);
      if (tweet.linkPreview) updateTweetPreview(tweet.id, null);
      return;
    }

    if (tweet.linkPreview?.url === firstUrl) {
      setLinkPreviewPending(false);
      return;
    }

    // P2-B: signal pending immediately so skeleton appears during the 1s debounce
    setLinkPreviewPending(true);

    const fetchPreview = async () => {
      try {
        const res = await fetch("/api/link-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: firstUrl }),
        });
        if (res.ok) {
          const data = await res.json();
          updateTweetPreview(tweet.id, { ...data, url: firstUrl });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLinkPreviewPending(false);
      }
    };

    const timeout = setTimeout(fetchPreview, 1000);
    return () => {
      clearTimeout(timeout);
      setLinkPreviewPending(false);
    };
  }, [tweet.content, tweet.id, updateTweetPreview, tweet.linkPreview]);

  return (
    <div className="group relative">
      <div
        role="button"
        tabIndex={0}
        aria-label={`Drag to reorder tweet ${index + 1}`}
        aria-roledescription="sortable"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-4 -left-8 hidden cursor-grab items-center transition-colors focus-visible:rounded focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing md:flex"
        {...dragHandleProps}
      >
        <GripVertical className="h-5 w-5" />
      </div>

      <Card
        className={cn(
          "border-l-4",
          isOverLimit(tweet.content) ? "border-l-destructive" : "border-l-primary",
          // Phase 3: Highlight target tweets when AI panel is open
          isAiTarget && "ring-primary/20 ring-2 transition-all"
        )}
      >
        <CardContent className="pt-3 sm:pt-4">
          <Textarea
            value={tweet.content}
            onChange={(e) => updateTweet(tweet.id, e.target.value)}
            placeholder="What's on your mind?"
            dir="auto"
            autoFocus={isFirst}
            className="min-h-[120px] resize-none border-none p-0 text-base focus-visible:ring-0 sm:min-h-[160px] sm:text-lg"
          />

          {/* A5: Auto-suggest thread conversion when single tweet exceeds 280 chars */}
          {totalTweets === 1 &&
            isOverStandardLimit(tweet.content) &&
            !canPostLongContent(selectedTier) && (
              <div className="mt-1.5 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>This exceeds 280 characters.</span>
                {onConvertToThread && (
                  <button
                    type="button"
                    className="text-primary font-medium hover:underline"
                    onClick={onConvertToThread}
                  >
                    Convert to thread?
                  </button>
                )}
              </div>
            )}

          {/* Media Preview */}
          {tweet.media.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
              {tweet.media.map((m, i) => (
                <div
                  key={m.placeholderId ?? `${m.url}-${i}`}
                  className="group/media relative h-16 w-16 overflow-hidden rounded-md border sm:h-20 sm:w-20"
                >
                  {m.uploading ? (
                    <div className="bg-muted flex h-full w-full items-center justify-center">
                      <Loader2 className="text-muted-foreground h-4 w-4 animate-spin sm:h-5 sm:w-5" />
                    </div>
                  ) : m.fileType === "video" && !m.url.match(/\.(jpg|jpeg|png|webp)(\?.*)?$/i) ? (
                    <video
                      src={m.url}
                      className="h-full w-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      crossOrigin="anonymous"
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <Image
                      src={m.url}
                      alt={`${m.fileType} preview`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  )}
                  {!m.uploading && (
                    <button
                      type="button"
                      className={cn(
                        "bg-background/80 hover:bg-background absolute top-0.5 right-0.5 rounded-sm p-0.5 transition-opacity sm:top-1 sm:right-1",
                        isDesktop ? "opacity-0 group-hover/media:opacity-100" : "opacity-100"
                      )}
                      onClick={() => removeTweetMedia(tweet.id, m.url)}
                      aria-label="Remove media"
                    >
                      <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : tweet.linkPreview ? (
            <div className="group/preview relative mt-2 overflow-hidden rounded-md border">
              {tweet.linkPreview.images?.[0] && (
                <div className="relative h-32 w-full sm:h-48">
                  <Image
                    src={tweet.linkPreview.images[0]}
                    alt="Preview"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              )}
              <div className="bg-muted/20 p-2 sm:p-3">
                <h4 className="line-clamp-1 text-xs font-medium sm:text-sm">
                  {tweet.linkPreview.title}
                </h4>
                <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[10px] sm:mt-1 sm:text-xs">
                  {tweet.linkPreview.description}
                </p>
                <p className="text-muted-foreground mt-0.5 text-[10px] lowercase sm:mt-1 sm:text-xs">
                  {new URL(tweet.linkPreview.url).hostname}
                </p>
              </div>
              <button
                type="button"
                className={cn(
                  "bg-background/80 hover:bg-background absolute top-0.5 right-0.5 rounded-sm p-0.5 transition-opacity sm:top-1 sm:right-1",
                  isDesktop ? "opacity-0 group-hover/preview:opacity-100" : "opacity-100"
                )}
                onClick={() => updateTweetPreview?.(tweet.id, null)}
                aria-label="Dismiss link preview"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
          ) : linkPreviewPending ? (
            // P2-B: skeleton during the 1s debounce delay before link preview fetch
            <div
              className="mt-2 overflow-hidden rounded-md border"
              aria-label="Loading link preview"
            >
              <Skeleton className="h-28 w-full rounded-none sm:h-36" />
              <div className="space-y-1.5 p-2 sm:space-y-2 sm:p-3">
                <Skeleton className="h-2.5 w-3/4 sm:h-3" />
                <Skeleton className="h-2.5 w-1/2 sm:h-3" />
                <Skeleton className="h-2.5 w-1/4 sm:h-3" />
              </div>
            </div>
          ) : null}

          {/* H8: Inline hashtag chips — appear directly under the tweet being composed */}
          {suggestedHashtags && suggestedHashtags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {suggestedHashtags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  aria-label={`Add hashtag ${tag}`}
                  onClick={() => onHashtagClick?.(tag)}
                  className="border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t pt-2 sm:pt-3">
          <TooltipProvider delayDuration={300}>
            <div className="flex gap-0.5 sm:gap-1">
              {/* P4-C: Reorder buttons visible on all screen sizes for keyboard accessibility.
                  Desktop users can use these as a keyboard alternative to the drag handle. */}
              {totalTweets > 1 && (
                <div className="me-0.5 flex gap-0 sm:me-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="touch-target h-7 w-7 sm:h-8 sm:w-8"
                    onClick={onMoveUp}
                    disabled={!onMoveUp}
                    aria-label={`Move tweet ${index + 1} up`}
                  >
                    <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="touch-target h-7 w-7 sm:h-8 sm:w-8"
                    onClick={onMoveDown}
                    disabled={!onMoveDown}
                    aria-label={`Move tweet ${index + 1} down`}
                  >
                    <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary h-7 gap-1 px-1.5 sm:h-8 sm:gap-1.5 sm:px-2"
                    onClick={() => triggerFileUpload(tweet.id)}
                    aria-label="Upload media"
                  >
                    <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden text-[10px] sm:inline sm:text-xs">Media</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Upload Media</TooltipContent>
              </Tooltip>

              {openAiImage && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary h-7 gap-1 px-1.5 sm:h-8 sm:gap-1.5 sm:px-2"
                      onClick={() => openAiImage(tweet.id)}
                      aria-label="Generate AI image"
                    >
                      <Wand2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden text-[10px] sm:inline sm:text-xs">AI Image</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Generate AI Image</TooltipContent>
                </Tooltip>
              )}

              {isDesktop ? (
                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary h-7 gap-1 px-1.5 sm:h-8 sm:gap-1.5 sm:px-2"
                          aria-label="Add emoji"
                          aria-haspopup="dialog"
                          aria-expanded={showEmojiPicker}
                        >
                          <Smile className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="hidden text-[10px] sm:inline sm:text-xs">Emoji</span>
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Add Emoji</TooltipContent>
                  </Tooltip>
                  <PopoverContent className="w-auto border-none bg-transparent p-0 shadow-none">
                    <EmojiPicker onEmojiClick={onEmojiClick} />
                  </PopoverContent>
                </Popover>
              ) : (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary h-7 gap-1 px-1.5 sm:h-8 sm:gap-1.5 sm:px-2"
                        aria-label="Add emoji"
                        aria-haspopup="dialog"
                        aria-expanded={showEmojiPicker}
                        onClick={() => setShowEmojiPicker(true)}
                      >
                        <Smile className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden text-[10px] sm:inline sm:text-xs">Emoji</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add Emoji</TooltipContent>
                  </Tooltip>
                  <Sheet open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                    <SheetContent side="bottom" className="h-[350px] px-0 sm:h-[400px]">
                      <SheetTitle className="sr-only">Emoji picker</SheetTitle>
                      <SheetDescription className="sr-only">
                        Select an emoji to insert
                      </SheetDescription>
                      <EmojiPicker onEmojiClick={onEmojiClick} width="100%" height={300} />
                    </SheetContent>
                  </Sheet>
                </>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive h-7 gap-1 px-1.5 sm:h-8 sm:gap-1.5 sm:px-2"
                    onClick={onClearTweet}
                    disabled={tweet.content === "" && tweet.media.length === 0}
                    aria-label="Clear tweet content"
                  >
                    <Eraser className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden text-[10px] sm:inline sm:text-xs">Clear</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear tweet</TooltipContent>
              </Tooltip>

              {totalTweets > 1 && onToggleNumbering && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isTweetsNumbered ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 gap-1 px-1.5 sm:h-8 sm:gap-1.5 sm:px-2"
                      onClick={onToggleNumbering}
                      aria-label={isTweetsNumbered ? "Remove numbering" : "Number tweets"}
                    >
                      <ListOrdered className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden text-[10px] sm:inline sm:text-xs">
                        {isTweetsNumbered ? "1/N on" : "1/N"}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isTweetsNumbered ? "Remove numbering" : "Number tweets 1/N"}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* P4-B: Visual counter — no aria-live (updates every keystroke, too noisy) */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "text-xs font-medium tabular-nums sm:text-sm",
                    isOverLimit(tweet.content)
                      ? "text-destructive"
                      : // P4-G: amber-700/amber-400 passes WCAG AA contrast on both light and dark
                        isOverStandardLimit(tweet.content)
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-muted-foreground"
                  )}
                >
                  {charCount} / {maxChars.toLocaleString()}
                </span>
                {/* P4-B: Off-screen aria-live span — only updates every 10 chars or near limit */}
                <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
                  {announcedCharCount} of {maxChars} characters
                </span>
                {canPostLongContent(tier) && tier && !isThreadMode && (
                  <XSubscriptionBadge tier={tier} size="sm" />
                )}
              </div>
              {/* Premium single-post: 280 milestone marker + length zone */}
              {isPremiumSinglePost && charCount > 0 && (
                <div className="flex w-full items-center gap-2">
                  {/* Mini progress bar with 280 milestone */}
                  <div className="bg-muted relative h-1 flex-1 overflow-hidden rounded-full">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        isOverLimit(tweet.content)
                          ? "bg-destructive"
                          : isOverStandardLimit(tweet.content)
                            ? "bg-amber-600 dark:bg-amber-500"
                            : "bg-primary/40"
                      )}
                      ref={(el) => {
                        if (el) el.style.width = `${Math.min(100, (charCount / maxChars) * 100)}%`;
                      }}
                    />
                    {/* 280 milestone tick */}
                    <div
                      className="bg-muted-foreground/30 absolute top-0 h-full w-px"
                      ref={(el) => {
                        if (el) el.style.left = `${(280 / maxChars) * 100}%`;
                      }}
                      title="Standard tweet length (280)"
                    />
                  </div>
                  <span className="text-muted-foreground/60 text-[10px] whitespace-nowrap">
                    {getLengthZone()}
                  </span>
                </div>
              )}
              {/* Thread mode per-tweet warning — P4-G: amber-700/amber-400 for WCAG AA contrast */}
              {isThreadMode && isOverStandardLimit(tweet.content) && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400" role="alert">
                  Exceeds 280 chars — threads use standard tweet length
                </p>
              )}
            </div>

            {totalTweets > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "touch-target text-destructive hover:bg-destructive/10 h-7 w-7 transition-opacity sm:h-8 sm:w-8",
                  isDesktop ? "opacity-0 group-hover:opacity-100" : "opacity-100"
                )}
                onClick={() => removeTweet(tweet.id)}
                aria-label={`Remove tweet ${index + 1}`}
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Connector Line */}
      {index < totalTweets - 1 && (
        <div className="bg-border absolute top-[2.5rem] bottom-[-1.5rem] left-[-1.5rem] -z-10 w-0.5 sm:top-[3rem] sm:bottom-[-2rem] sm:left-[-1.9rem]" />
      )}
    </div>
  );
}
