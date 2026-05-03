/**
 * AI Image Dialog Component
 * Dialog for generating AI images to attach to tweets
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Wand2,
  Loader2,
  Sparkles,
  RefreshCw,
  Check,
  AlertCircle,
  RotateCcw,
  Download,
  XIcon,
  Lock,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { clientLogger } from "@/lib/client-logger";
import { cn } from "@/lib/utils";

type ImageModel = "nano-banana-2" | "nano-banana-pro" | "nano-banana" | "gpt-image-2";
const ALL_MODELS: ImageModel[] = ["nano-banana-2", "nano-banana-pro", "nano-banana", "gpt-image-2"];
type AspectRatio = "1:1" | "16:9" | "4:3" | "9:16";
type ImageStyle =
  | "photorealistic"
  | "illustration"
  | "minimalist"
  | "abstract"
  | "infographic"
  | "meme";

interface GeneratedImage {
  imageUrl: string;
  width: number;
  height: number;
  model: string;
  prompt: string;
}

interface AiImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tweetContent: string;
  onImageAttach: (image: GeneratedImage) => void;
  availableModels: ImageModel[];
  userPreferredModel: ImageModel;
  remainingQuota: number;
  attachedCount: number; // current media count on the target tweet (0-4)
}

const MODEL_LABELS: Record<ImageModel, string> = {
  "nano-banana-2": "Nano Banana 2 (Fast)",
  "nano-banana-pro": "Nano Banana Pro (Best)",
  "nano-banana": "Nano Banana",
  "gpt-image-2": "GPT Image 2 (Advanced)",
};

const ASPECT_RATIO_LABELS: Record<AspectRatio, string> = {
  "1:1": "1:1 (Square)",
  "16:9": "16:9 (Landscape)",
  "4:3": "4:3 (Standard)",
  "9:16": "9:16 (Portrait)",
};

const STYLE_OPTIONS: Array<{ value: ImageStyle; label: string; emoji: string }> = [
  { value: "photorealistic", label: "Photorealistic", emoji: "📷" },
  { value: "illustration", label: "Illustration", emoji: "🎨" },
  { value: "minimalist", label: "Minimalist", emoji: "✨" },
  { value: "abstract", label: "Abstract", emoji: "🔮" },
  { value: "infographic", label: "Infographic", emoji: "📊" },
  { value: "meme", label: "Meme", emoji: "😄" },
];

export function AiImageDialog({
  open,
  onOpenChange,
  tweetContent,
  onImageAttach,
  availableModels,
  userPreferredModel,
  remainingQuota,
  attachedCount,
}: AiImageDialogProps) {
  const t = useTranslations("ai_image");
  // State
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<ImageModel>(
    availableModels.includes(userPreferredModel)
      ? userPreferredModel
      : availableModels[0] || "nano-banana-2"
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [style, setStyle] = useState<ImageStyle | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [imageHistory, setImageHistory] = useState<GeneratedImage[]>([]);

  // Inline error shown when a generation fails (null = no error / cleared).
  const [generationError, setGenerationError] = useState<{
    message: string;
    retryable: boolean;
    code: string;
  } | null>(null);

  // Ref to the active polling timer so we can cancel it when the dialog closes
  // or the component unmounts.
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePollingIdRef = useRef<string | null>(null);
  // Tracks auto-retry attempts so we retry transient errors once before surfacing to the user.
  const retryCountRef = useRef(0);

  // P2-C: Progress tracking — estimated-time indicator for AI image generation.
  const ESTIMATED_DURATION_MS = 15_000; // Progress bar fills over 15 s
  const LONG_WAIT_THRESHOLD_MS = 25_000; // "Taking longer" message after 25 s
  const [progressPercent, setProgressPercent] = useState(0);
  const [isLongWait, setIsLongWait] = useState(false);
  const generationStartRef = useRef<number | null>(null);
  const progressRafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  // Animate progress bar from 0→~90% over ESTIMATED_DURATION_MS using rAF.
  const startProgressAnimation = useCallback(() => {
    generationStartRef.current = Date.now();
    setProgressPercent(0);
    setIsLongWait(false);

    const tick = () => {
      if (!generationStartRef.current) return;
      const elapsed = Date.now() - generationStartRef.current;
      // Ease-out curve: fill quickly at first, slow down as we approach the estimate.
      // Using a simple log curve that asymptotes toward 90%.
      const ratio = Math.min(elapsed / ESTIMATED_DURATION_MS, 1);
      const eased = 1 - Math.pow(1 - ratio, 2); // quadratic ease-out
      const pct = Math.min(Math.round(eased * 90), 90); // cap at 90% — 100% reserved for completion
      setProgressPercent(pct);

      if (elapsed >= LONG_WAIT_THRESHOLD_MS) {
        setIsLongWait(true);
      }

      if (elapsed < ESTIMATED_DURATION_MS * 3) {
        // Keep animating for up to ~45 s, then stop updating
        progressRafRef.current = requestAnimationFrame(tick);
      }
    };

    progressRafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopProgressAnimation = useCallback(() => {
    if (progressRafRef.current) {
      cancelAnimationFrame(progressRafRef.current);
      progressRafRef.current = null;
    }
    generationStartRef.current = null;
  }, []);

  // Clean up rAF on unmount
  useEffect(() => {
    return () => {
      stopProgressAnimation();
    };
  }, [stopProgressAnimation]);

  // Cancel any in-flight poll when the dialog closes.
  const cancelPolling = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    activePollingIdRef.current = null;
    stopProgressAnimation();
  };

  // Reset state when dialog opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      cancelPolling();
      setPrompt("");
      setGeneratedImage(null);
      setImageHistory([]);
      setIsGenerating(false);
      setGenerationError(null);
      setProgressPercent(0);
      setIsLongWait(false);
      retryCountRef.current = 0;
    }
    onOpenChange(newOpen);
  };

  // Poll GET /api/ai/image/status every 2 s until completion.
  // Defined as a plain function (no useCallback) so the latest state setters
  // and refs are always in scope without needing to track deps.
  function pollForResult(predictionId: string) {
    pollTimerRef.current = setTimeout(async () => {
      // If the polling ID changed (dialog closed / regenerated), bail out.
      if (activePollingIdRef.current !== predictionId) return;

      try {
        const res = await fetch(`/api/ai/image/status?id=${predictionId}`);
        const data = await res.json();

        if (!res.ok) {
          const code: string = data.code ?? "GENERATION_FAILED";
          const retryable: boolean = data.retryable === true;

          // Auto-retry once for transient service errors before surfacing to user.
          if (retryable && retryCountRef.current < 1) {
            retryCountRef.current += 1;
            // Re-trigger a fresh generation — the failed prediction's Redis key
            // was already deleted by the status route, so we start from scratch.
            setIsGenerating(false);
            activePollingIdRef.current = null;
            toast.info(t("service_busy"), { duration: 3000 });
            // Short delay so the user sees the retrying message before we re-fire.
            pollTimerRef.current = setTimeout(() => {
              void handleGenerate();
            }, 3500);
            return;
          }

          // Exhausted retries or permanent failure — show inline error panel.
          stopProgressAnimation();
          setGenerationError({
            message: data.error || "Image generation failed. Please try again.",
            retryable,
            code,
          });
          setIsGenerating(false);
          activePollingIdRef.current = null;
          return;
        }

        if (data.status === "starting" || data.status === "processing") {
          pollForResult(predictionId);
        } else if (data.status === "fallback") {
          // Primary model failed — server transparently switched to the fallback
          // model and returned a new prediction ID. Swap polling targets silently.
          const newId: string = data.predictionId;
          activePollingIdRef.current = newId;
          toast.info(t("switching_model"), { duration: 3000 });
          pollForResult(newId);
        } else if (data.status === "succeeded") {
          stopProgressAnimation();
          setProgressPercent(100); // P2-C: jump to complete
          retryCountRef.current = 0;
          const generated: GeneratedImage = {
            imageUrl: data.imageUrl,
            width: data.width,
            height: data.height,
            model: data.model,
            prompt: data.prompt,
          };
          setGeneratedImage(generated);
          setImageHistory((prev) => [...prev, generated]);
          toast.success(t("generated_success"));
          setIsGenerating(false);
          activePollingIdRef.current = null;
        }
      } catch {
        stopProgressAnimation();
        setGenerationError({
          message: "Network error — could not check image status. Please try again.",
          retryable: true,
          code: "NETWORK_ERROR",
        });
        setIsGenerating(false);
        activePollingIdRef.current = null;
      }
    }, 2000);
  }

  // Auto-generate prompt from tweet content if prompt is empty
  const handleGenerate = async () => {
    if (remainingQuota === 0) {
      toast.error(t("quota_reached"), {
        action: {
          label: "Upgrade",
          onClick: () => (window.location.href = "/pricing"),
        },
      });
      return;
    }

    cancelPolling();
    setGenerationError(null);
    retryCountRef.current = 0;
    setIsGenerating(true);
    startProgressAnimation(); // P2-C: start estimated-time progress bar

    try {
      const requestBody: {
        prompt?: string;
        tweetContent?: string;
        model: ImageModel;
        aspectRatio: AspectRatio;
        style?: ImageStyle;
      } = { model, aspectRatio };

      if (prompt.trim()) {
        requestBody.prompt = prompt.trim();
      } else if (tweetContent.trim()) {
        requestBody.tweetContent = tweetContent.trim();
      } else {
        toast.error(t("enter_prompt"));
        stopProgressAnimation();
        setIsGenerating(false);
        return;
      }

      if (style) {
        requestBody.style = style;
      }

      const response = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 402 || response.status === 403) {
          toast.error(error.error || "Quota exceeded. Please upgrade.", {
            action: {
              label: "Upgrade",
              onClick: () => (window.location.href = "/pricing"),
            },
          });
        } else if (response.status === 429) {
          toast.error(t("rate_limited"));
        } else {
          toast.error(error.error || "Failed to start image generation");
        }
        stopProgressAnimation();
        setIsGenerating(false);
        return;
      }

      // Server returns {predictionId, estimatedSeconds} — start client-side polling.
      const { predictionId } = await response.json();
      activePollingIdRef.current = predictionId;
      pollForResult(predictionId);
    } catch (error) {
      clientLogger.error("AI image generation failed", {
        model,
        error: error instanceof Error ? error.message : String(error),
      });
      stopProgressAnimation();
      toast.error(t("generation_failed"));
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const handleDownload = async () => {
    if (!generatedImage) return;
    setIsDownloading(true);
    try {
      const res = await fetch(
        `/api/ai/image/download?url=${encodeURIComponent(generatedImage.imageUrl)}`
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `astrapost-image-${Date.now()}.webp`;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error(t("download_failed"));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAttach = () => {
    if (generatedImage) {
      onImageAttach(generatedImage);
      toast.success(t("attached"));
    }
  };

  const handleSelectHistoryImage = (image: GeneratedImage) => {
    setGeneratedImage(image);
    setPrompt(image.prompt);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-x-hidden overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="text-primary h-5 w-5" />
            Generate AI Image
          </DialogTitle>
          <DialogDescription>
            Create an AI-generated image for your tweet using the power of multiple image models.
          </DialogDescription>
        </DialogHeader>

        <div className="w-full min-w-0 space-y-6 py-4">
          {/* Quota Display */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Monthly quota:</span>
            <span
              className={cn(
                "font-medium",
                remainingQuota <= 3
                  ? "text-destructive"
                  : remainingQuota <= 10
                    ? "text-orange-500"
                    : "text-green-600"
              )}
            >
              {remainingQuota === -1 ? "Unlimited" : `${remainingQuota} remaining`}
            </span>
          </div>

          {/* Prompt Input */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Image Prompt</Label>
            <Textarea
              id="prompt"
              autoFocus
              placeholder={
                tweetContent
                  ? `AI will generate a prompt from: "${tweetContent.slice(0, 100)}${tweetContent.length > 100 ? "..." : ""}"`
                  : "Describe the image you want to generate..."
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[80px] resize-none"
              disabled={isGenerating}
            />
            {!prompt && tweetContent && (
              <p className="text-muted-foreground text-xs">
                <Sparkles className="mr-1 inline h-3 w-3" />
                Leave empty to auto-generate from tweet content
              </p>
            )}
          </div>

          {/* Options Grid */}
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            {/* Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select
                value={model}
                onValueChange={(value) => setModel(value as ImageModel)}
                disabled={isGenerating}
              >
                <SelectTrigger id="model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_MODELS.map((m) => {
                    const isLocked = !availableModels.includes(m);
                    return (
                      <SelectItem key={m} value={m} disabled={isLocked}>
                        <span className="flex items-center gap-2">
                          {MODEL_LABELS[m]}
                          {isLocked && <Lock className="text-muted-foreground h-3 w-3 shrink-0" />}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {ALL_MODELS.some((m) => !availableModels.includes(m)) && (
                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Lock className="h-3 w-3" />
                  Upgrade to Pro to unlock all models
                </p>
              )}
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <Label htmlFor="aspectRatio">Aspect Ratio</Label>
              <Select
                value={aspectRatio}
                onValueChange={(value) => setAspectRatio(value as AspectRatio)}
                disabled={isGenerating}
              >
                <SelectTrigger id="aspectRatio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ASPECT_RATIO_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Style Selection */}
          <div className="space-y-2">
            <Label>Style (Optional)</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={style === undefined ? "default" : "outline"}
                size="sm"
                onClick={() => setStyle(undefined)}
                disabled={isGenerating}
              >
                None
              </Button>
              {STYLE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={style === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStyle(option.value)}
                  disabled={isGenerating}
                >
                  {option.emoji} {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Generated Image Preview */}
          {generatedImage && (
            <div className="space-y-3">
              <Label>Generated Image</Label>
              <div className="bg-muted relative overflow-hidden rounded-lg border">
                <div className="relative aspect-square w-full">
                  <Image
                    src={generatedImage.imageUrl}
                    alt="Generated image"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 512px"
                  />
                </div>
                <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <p className="line-clamp-2 text-xs text-white">{generatedImage.prompt}</p>
                </div>
              </div>

              {/* Image History */}
              {imageHistory.length > 1 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">
                    History ({imageHistory.length})
                  </Label>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {imageHistory.map((img, idx) => (
                      <button
                        key={`${img.imageUrl}-${idx}`}
                        onClick={() => handleSelectHistoryImage(img)}
                        aria-label={`Select generated image ${idx + 1}`}
                        className={cn(
                          "relative h-16 w-16 flex-shrink-0 overflow-hidden rounded border-2",
                          generatedImage.imageUrl === img.imageUrl
                            ? "border-primary"
                            : "border-muted"
                        )}
                      >
                        <Image
                          src={img.imageUrl}
                          alt={`Generated ${idx + 1}`}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* P2-C: Loading State — estimated-time progress indicator */}
          {isGenerating && (
            <div role="status" aria-label="Generating image" className="space-y-4 py-4">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300 ease-out",
                      progressPercent >= 100 ? "bg-green-500" : "bg-primary"
                    )}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="text-muted-foreground flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    {isLongWait ? "Taking longer than usual..." : "Generating your image..."}
                  </span>
                  <span>{progressPercent}%</span>
                </div>
              </div>
              {/* Hint text */}
              <p className="text-muted-foreground/70 text-center text-xs">
                {isLongWait
                  ? "Still working — this sometimes happens with complex prompts."
                  : "Usually takes 10–20 seconds."}
              </p>
            </div>
          )}

          {/* Inline error panel — shown after generation fails */}
          {!isGenerating && generationError && (
            <div
              role="alert"
              className={cn(
                "space-y-3 rounded-lg border p-4",
                generationError.retryable
                  ? "border-orange-500/40 bg-orange-500/5"
                  : generationError.code === "CONTENT_BLOCKED"
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-muted bg-muted/30"
              )}
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  className={cn(
                    "mt-0.5 h-5 w-5 shrink-0",
                    generationError.retryable
                      ? "text-orange-500"
                      : generationError.code === "CONTENT_BLOCKED"
                        ? "text-destructive"
                        : "text-muted-foreground"
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">
                    {generationError.retryable
                      ? "Service temporarily unavailable"
                      : generationError.code === "CONTENT_BLOCKED"
                        ? "Prompt blocked by safety filters"
                        : "Image generation failed"}
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {generationError.message}
                  </p>
                  {generationError.retryable && (
                    <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
                      ✓ No credits were used — you can try again freely.
                    </p>
                  )}
                </div>
              </div>
              {(generationError.retryable || generationError.code === "CONTENT_BLOCKED") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void handleGenerate();
                  }}
                  className="w-full"
                >
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  {generationError.code === "CONTENT_BLOCKED"
                    ? "Try with adjusted prompt"
                    : "Try Again"}
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {!generatedImage ? (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  void handleGenerate();
                }}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : generationError ? (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Try Again
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleRegenerate} disabled={isGenerating}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
              {generatedImage && (
                <Button
                  variant="outline"
                  onClick={() => {
                    void handleDownload();
                  }}
                  disabled={isDownloading || isGenerating}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </>
                  )}
                </Button>
              )}
              <Button onClick={handleAttach} disabled={isGenerating || attachedCount >= 4}>
                <Check className="mr-2 h-4 w-4" />
                {attachedCount >= 4
                  ? "Max images reached (4/4)"
                  : attachedCount > 0
                    ? `Attach to Tweet (${attachedCount}/4)`
                    : "Attach to Tweet"}
              </Button>
              <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                <XIcon className="mr-2 h-4 w-4" />
                {t("close")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
