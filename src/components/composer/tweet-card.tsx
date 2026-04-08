
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { X, Image as ImageIcon, Loader2, Smile, Wand2, ChevronUp, ChevronDown, GripVertical, Eraser, AlertCircle } from "lucide-react";
import twitter from 'twitter-text';
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
import type { EmojiClickData } from 'emoji-picker-react';

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
                body: JSON.stringify({ url: firstUrl })
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
    <div className="relative group">
      <div
        role="button"
        tabIndex={0}
        aria-label={`Drag to reorder tweet ${index + 1}`}
        aria-roledescription="sortable"
        className="hidden md:flex absolute -left-8 top-4 items-center text-muted-foreground cursor-grab active:cursor-grabbing hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded"
        {...dragHandleProps}
      >
        <GripVertical className="h-5 w-5" />
      </div>
      
      <Card className={cn(
        "border-l-4",
        isOverLimit(tweet.content) ? "border-l-destructive" : "border-l-primary",
        // Phase 3: Highlight target tweets when AI panel is open
        isAiTarget && "ring-2 ring-primary/20 transition-all"
      )}>
        <CardContent className="pt-4">
          <Textarea
            value={tweet.content}
            onChange={(e) => updateTweet(tweet.id, e.target.value)}
            placeholder="What's on your mind?"
            dir="auto"
            autoFocus={isFirst}
            className="min-h-[160px] resize-none border-none focus-visible:ring-0 text-lg p-0"
          />

          {/* A5: Auto-suggest thread conversion when single tweet exceeds 280 chars */}
          {totalTweets === 1 && isOverStandardLimit(tweet.content) && !canPostLongContent(selectedTier) && (
            <div className="mt-1.5 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>This exceeds 280 characters.</span>
              {onConvertToThread && (
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={onConvertToThread}
                >
                  Convert to thread?
                </button>
              )}
            </div>
          )}

          {/* Media Preview */}
          {tweet.media.length > 0 ? (
            <div className="mt-2 flex gap-2 flex-wrap">
              {tweet.media.map((m, i) => (
                <div key={m.placeholderId ?? `${m.url}-${i}`} className="relative w-20 h-20 rounded-md overflow-hidden border group/media">
                  {m.uploading ? (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : m.fileType === "video" ? (
                    <video src={m.url} className="w-full h-full object-cover" />
                  ) : (
                    <Image src={m.url} alt={`${m.fileType} preview`} fill className="object-cover" sizes="80px" />
                  )}
                  {!m.uploading && (
                    <button
                      type="button"
                      className={cn("absolute top-1 right-1 rounded-sm bg-background/80 p-0.5 hover:bg-background transition-opacity", isDesktop ? "opacity-0 group-hover/media:opacity-100" : "opacity-100")}
                      onClick={() => removeTweetMedia(tweet.id, m.url)}
                      aria-label="Remove media"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : tweet.linkPreview ? (
             <div className="mt-2 border rounded-md overflow-hidden relative group/preview">
                 {tweet.linkPreview.images?.[0] && (
                     <div className="relative h-48 w-full">
                         <Image src={tweet.linkPreview.images[0]} alt="Preview" fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                     </div>
                 )}
                 <div className="p-3 bg-muted/20">
                     <h4 className="font-medium text-sm line-clamp-1">{tweet.linkPreview.title}</h4>
                     <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{tweet.linkPreview.description}</p>
                     <p className="text-xs text-muted-foreground mt-1 lowercase">{new URL(tweet.linkPreview.url).hostname}</p>
                 </div>
                 <button
                    type="button"
                    className={cn("absolute top-1 right-1 rounded-sm bg-background/80 p-0.5 hover:bg-background transition-opacity", isDesktop ? "opacity-0 group-hover/preview:opacity-100" : "opacity-100")}
                    onClick={() => updateTweetPreview?.(tweet.id, null)}
                    aria-label="Dismiss link preview"
                 >
                    <X className="h-4 w-4" />
                 </button>
             </div>
          ) : linkPreviewPending ? (
            // P2-B: skeleton during the 1s debounce delay before link preview fetch
            <div className="mt-2 border rounded-md overflow-hidden" aria-label="Loading link preview">
              <Skeleton className="h-36 w-full rounded-none" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
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
                  className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between items-center border-t pt-3">
          <TooltipProvider delayDuration={300}>
            <div className="flex gap-1">
              {/* P4-C: Reorder buttons visible on all screen sizes for keyboard accessibility.
                  Desktop users can use these as a keyboard alternative to the drag handle. */}
              {totalTweets > 1 && (
                <div className="flex gap-0.5 me-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="touch-target"
                    onClick={onMoveUp}
                    disabled={!onMoveUp}
                    aria-label={`Move tweet ${index + 1} up`}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="touch-target"
                    onClick={onMoveDown}
                    disabled={!onMoveDown}
                    aria-label={`Move tweet ${index + 1} down`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 gap-1.5 text-primary"
                    onClick={() => triggerFileUpload(tweet.id)}
                    aria-label="Upload media"
                  >
                    <ImageIcon className="h-4 w-4" />
                    <span className="text-xs hidden sm:inline">Media</span>
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
                      className="h-8 px-2 gap-1.5 text-primary"
                      onClick={() => openAiImage(tweet.id)}
                      aria-label="Generate AI image"
                    >
                      <Wand2 className="h-4 w-4" />
                      <span className="text-xs hidden sm:inline">AI Image</span>
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
                          className="h-8 px-2 gap-1.5 text-primary"
                          aria-label="Add emoji"
                          aria-haspopup="dialog"
                          aria-expanded={showEmojiPicker}
                        >
                          <Smile className="h-4 w-4" />
                          <span className="text-xs hidden sm:inline">Emoji</span>
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Add Emoji</TooltipContent>
                  </Tooltip>
                  <PopoverContent className="w-auto p-0 border-none shadow-none bg-transparent">
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
                        className="h-8 px-2 gap-1.5 text-primary"
                        aria-label="Add emoji"
                        aria-haspopup="dialog"
                        aria-expanded={showEmojiPicker}
                        onClick={() => setShowEmojiPicker(true)}
                      >
                        <Smile className="h-4 w-4" />
                        <span className="text-xs hidden sm:inline">Emoji</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add Emoji</TooltipContent>
                  </Tooltip>
                  <Sheet open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                    <SheetContent side="bottom" className="h-[400px] px-0">
                      <SheetTitle className="sr-only">Emoji picker</SheetTitle>
                      <SheetDescription className="sr-only">Select an emoji to insert</SheetDescription>
                      <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        width="100%"
                        height={350}
                      />
                    </SheetContent>
                  </Sheet>
                </>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-destructive"
                    onClick={onClearTweet}
                    disabled={tweet.content === "" && tweet.media.length === 0}
                    aria-label="Clear tweet content"
                  >
                    <Eraser className="h-4 w-4" />
                    <span className="text-xs hidden sm:inline">Clear</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear tweet</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-2">
                {/* P4-B: Visual counter — no aria-live (updates every keystroke, too noisy) */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "text-sm font-medium tabular-nums",
                    isOverLimit(tweet.content) ? "text-destructive" :
                    // P4-G: amber-700/amber-400 passes WCAG AA contrast on both light and dark
                    isOverStandardLimit(tweet.content) ? "text-amber-700 dark:text-amber-400" :
                    "text-muted-foreground"
                  )}
                >
                  {charCount} / {maxChars.toLocaleString()}
                </span>
                {/* P4-B: Off-screen aria-live span — only updates every 10 chars or near limit */}
                <span
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  className="sr-only"
                >
                  {announcedCharCount} of {maxChars} characters
                </span>
                {canPostLongContent(tier) && tier && !isThreadMode && (
                  <XSubscriptionBadge tier={tier} size="sm" />
                )}
              </div>
              {/* Premium single-post: 280 milestone marker + length zone */}
              {isPremiumSinglePost && charCount > 0 && (
                <div className="flex items-center gap-2 w-full">
                  {/* Mini progress bar with 280 milestone */}
                  <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden relative">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all [width:var(--bar-width)]",
                        isOverLimit(tweet.content) ? "bg-destructive" :
                        isOverStandardLimit(tweet.content) ? "bg-amber-600 dark:bg-amber-500" :
                        "bg-primary/40"
                      )}
                      style={{ "--bar-width": `${Math.min(100, (charCount / maxChars) * 100)}%` } as React.CSSProperties}
                    />
                    {/* 280 milestone tick */}
                    <div
                      className="absolute top-0 h-full w-px bg-muted-foreground/30 [left:var(--tick-left)]"
                      style={{ "--tick-left": `${(280 / maxChars) * 100}%` } as React.CSSProperties}
                      title="Standard tweet length (280)"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap">
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
                className={cn("touch-target text-destructive hover:bg-destructive/10 transition-opacity", isDesktop ? "opacity-0 group-hover:opacity-100" : "opacity-100")}
                onClick={() => removeTweet(tweet.id)}
                aria-label={`Remove tweet ${index + 1}`}
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
      
      {/* Connector Line */}
      {index < totalTweets - 1 && (
        <div className="absolute left-[-1.9rem] top-[3rem] bottom-[-2rem] w-0.5 bg-border -z-10" />
      )}
    </div>
  );
}
