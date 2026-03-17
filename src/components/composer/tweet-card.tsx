
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { X, Image as ImageIcon, Sparkles, Hash, Smile, Wand2, ChevronUp, ChevronDown } from "lucide-react";
import twitter from 'twitter-text';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/use-media-query";
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
  openAiTool: (tool: "thread" | "hook" | "cta" | "rewrite" | "translate" | "hashtags", tweetId?: string) => void;
  openAiImage?: (tweetId: string) => void;
  dragHandleProps?: any;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
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
  openAiTool,
  openAiImage,
  dragHandleProps,
  onMoveUp,
  onMoveDown,
}: TweetCardProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const getCharCount = (text: string) => twitter.parseTweet(text).weightedLength;
  const isOverLimit = (text: string) => getCharCount(text) > 1000;

  const onEmojiClick = (emojiData: EmojiClickData) => {
    updateTweet(tweet.id, tweet.content + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    if (!updateTweetPreview) return;
    const urls = twitter.extractUrls(tweet.content);
    const firstUrl = urls[0];

    if (!firstUrl) {
      if (tweet.linkPreview) updateTweetPreview(tweet.id, null);
      return;
    }

    if (tweet.linkPreview?.url === firstUrl) return;

    const fetchPreview = async () => {
        try {
            const res = await fetch("/api/link-preview", {
                method: "POST",
                body: JSON.stringify({ url: firstUrl })
            });
            if (res.ok) {
                const data = await res.json();
                updateTweetPreview(tweet.id, { ...data, url: firstUrl });
            }
        } catch (e) {
            console.error(e);
        }
    };
    
    const timeout = setTimeout(fetchPreview, 1000);
    return () => clearTimeout(timeout);
  }, [tweet.content, tweet.id, updateTweetPreview, tweet.linkPreview]);

  return (
    <div className="relative group">
      <div
        role="button"
        tabIndex={0}
        aria-label={`Reorder tweet ${index + 1}`}
        aria-roledescription="sortable"
        className="hidden md:block absolute -left-8 top-4 text-muted-foreground font-mono text-sm cursor-grab active:cursor-grabbing hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded"
        {...dragHandleProps}
        title="Drag to reorder"
      >
        {index + 1}
      </div>
      
      <Card className={cn(
        "border-l-4",
        isOverLimit(tweet.content) ? "border-l-destructive" : "border-l-primary"
      )}>
        <CardContent className="pt-4">
          <Textarea
            value={tweet.content}
            onChange={(e) => updateTweet(tweet.id, e.target.value)}
            placeholder="What's happening?"
            dir="auto"
            className="min-h-[120px] resize-none border-none focus-visible:ring-0 text-lg p-0"
          />
          
          {/* Media Preview */}
          {tweet.media.length > 0 ? (
            <div className="mt-2 flex gap-2 flex-wrap">
              {tweet.media.map((m, i) => (
                <div key={`${m.url}-${i}`} className="relative w-20 h-20 rounded-md overflow-hidden border">
                  {m.fileType === "video" ? (
                    <video src={m.url} className="w-full h-full object-cover" />
                  ) : (
                    <Image src={m.url} alt="Preview" fill className="object-cover" sizes="80px" />
                  )}
                  <button
                    type="button"
                    className="absolute top-1 right-1 rounded-sm bg-background/80 p-0.5 hover:bg-background"
                    onClick={() => removeTweetMedia(tweet.id, m.url)}
                    aria-label="Remove media"
                  >
                    <X className="h-4 w-4" />
                  </button>
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
                    className="absolute top-1 right-1 rounded-sm bg-background/80 p-0.5 hover:bg-background opacity-0 group-hover/preview:opacity-100 transition-opacity"
                    onClick={() => updateTweetPreview?.(tweet.id, null)}
                    aria-label="Dismiss link preview"
                 >
                    <X className="h-4 w-4" />
                 </button>
             </div>
          ) : null}
        </CardContent>
        
        <CardFooter className="flex justify-between items-center border-t pt-3">
          <TooltipProvider delayDuration={300}>
            <div className="flex gap-1">
              {/* Mobile-only reorder buttons — desktop uses the drag handle */}
              {totalTweets > 1 && (
                <div className="flex md:hidden gap-0.5 me-1">
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
                    size="icon"
                    className="touch-target text-primary"
                    onClick={() => triggerFileUpload(tweet.id)}
                    aria-label="Upload media"
                  >
                    <ImageIcon className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Upload Media</TooltipContent>
              </Tooltip>

              {openAiImage && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="touch-target text-primary"
                      onClick={() => openAiImage(tweet.id)}
                      aria-label="Generate AI image"
                    >
                      <Wand2 className="h-5 w-5" />
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
                          size="icon"
                          className="touch-target text-primary"
                          aria-label="Add emoji"
                        >
                          <Smile className="h-5 w-5" />
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
                        size="icon"
                        className="touch-target text-primary"
                        aria-label="Add emoji"
                        onClick={() => setShowEmojiPicker(true)}
                      >
                        <Smile className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add Emoji</TooltipContent>
                  </Tooltip>
                  <Sheet open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                    <SheetContent side="bottom" className="h-[400px] px-0">
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
                    size="icon"
                    className="touch-target text-primary"
                    onClick={() => openAiTool("rewrite", tweet.id)}
                    aria-label="Rewrite with AI"
                  >
                    <Sparkles className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rewrite with AI</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="touch-target text-primary"
                    onClick={() => openAiTool("hashtags", tweet.id)}
                    aria-label="Generate hashtags"
                  >
                    <Hash className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Generate Hashtags</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
          
          <div className="flex items-center gap-4">
            <span
              role="status"
              aria-live="polite"
              aria-atomic="true"
              aria-label={`${getCharCount(tweet.content)} of 1000 characters used`}
              className={cn(
                "text-sm font-medium tabular-nums",
                isOverLimit(tweet.content) ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {getCharCount(tweet.content)} / 1000
            </span>
            
            {totalTweets > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="touch-target text-destructive hover:bg-destructive/10"
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
