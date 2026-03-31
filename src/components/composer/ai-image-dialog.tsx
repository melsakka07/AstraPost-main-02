/**
 * AI Image Dialog Component
 * Dialog for generating AI images to attach to tweets
 */

"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  Wand2,
  Loader2,
  Sparkles,
  RefreshCw,
  Check,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
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
import { cn } from "@/lib/utils";

type ImageModel = "nano-banana-2" | "nano-banana-pro" | "nano-banana";
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
}

const MODEL_LABELS: Record<ImageModel, string> = {
  "nano-banana-2": "Nano Banana 2 (Fast)",
  "nano-banana-pro": "Nano Banana Pro (Best)",
  "nano-banana": "Nano Banana",
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
}: AiImageDialogProps) {
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
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(
    null
  );
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

  // Cancel any in-flight poll when the dialog closes.
  const cancelPolling = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    activePollingIdRef.current = null;
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
            toast.info("Service busy — retrying automatically…", { duration: 3000 });
            // Short delay so the user sees the retrying message before we re-fire.
            pollTimerRef.current = setTimeout(() => { void handleGenerate(); }, 3500);
            return;
          }

          // Exhausted retries or permanent failure — show inline error panel.
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
          toast.info("Switching to backup model…", { duration: 3000 });
          pollForResult(newId);
        } else if (data.status === "succeeded") {
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
          toast.success("Image generated successfully!");
          setIsGenerating(false);
          activePollingIdRef.current = null;
        }
      } catch {
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
      toast.error(
        "You've reached your monthly AI image quota. Please upgrade to continue.",
        {
          action: {
            label: "Upgrade",
            onClick: () => (window.location.href = "/pricing"),
          },
        }
      );
      return;
    }

    cancelPolling();
    setGenerationError(null);
    retryCountRef.current = 0;
    setIsGenerating(true);

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
        toast.error("Please enter a prompt or write tweet content first.");
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
          toast.error("Rate limit exceeded. Please wait a moment.");
        } else {
          toast.error(error.error || "Failed to start image generation");
        }
        setIsGenerating(false);
        return;
      }

      // Server returns {predictionId, estimatedSeconds} — start client-side polling.
      const { predictionId } = await response.json();
      activePollingIdRef.current = predictionId;
      pollForResult(predictionId);
    } catch (error) {
      console.error("AI image generation error:", error);
      toast.error("Failed to generate image. Please try again.");
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const handleAttach = () => {
    if (generatedImage) {
      onImageAttach(generatedImage);
      handleOpenChange(false);
      toast.success("Image attached to tweet!");
    }
  };

  const handleSelectHistoryImage = (image: GeneratedImage) => {
    setGeneratedImage(image);
    setPrompt(image.prompt);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Generate AI Image
          </DialogTitle>
          <DialogDescription>
            Create an AI-generated image for your tweet using the power of
            multiple image models.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
              {remainingQuota === -1
                ? "Unlimited"
                : `${remainingQuota} remaining`}
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
              <p className="text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3 inline mr-1" />
                Leave empty to auto-generate from tweet content
              </p>
            )}
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  {availableModels.map((m) => (
                    <SelectItem key={m} value={m}>
                      {MODEL_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <div className="relative rounded-lg overflow-hidden border bg-muted">
                <div className="relative aspect-square w-full">
                  <Image
                    src={generatedImage.imageUrl}
                    alt="Generated image"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 512px"
                  />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <p className="text-white text-xs line-clamp-2">
                    {generatedImage.prompt}
                  </p>
                </div>
              </div>

              {/* Image History */}
              {imageHistory.length > 1 && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    History ({imageHistory.length})
                  </Label>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {imageHistory.map((img, idx) => (
                      <button
                        key={`${img.imageUrl}-${idx}`}
                        onClick={() => handleSelectHistoryImage(img)}
                        aria-label={`Select generated image ${idx + 1}`}
                        className={cn(
                          "relative flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden",
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

          {/* Loading State */}
          {isGenerating && (
            <div role="status" aria-label="Generating image" className="flex flex-col items-center justify-center py-8 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Generating your image...
              </p>
              <p className="text-xs text-muted-foreground">
                This may take 10–30 seconds
              </p>
            </div>
          )}

          {/* Inline error panel — shown after generation fails */}
          {!isGenerating && generationError && (
            <div
              role="alert"
              className={cn(
                "rounded-lg border p-4 space-y-3",
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
                    "h-5 w-5 mt-0.5 shrink-0",
                    generationError.retryable
                      ? "text-orange-500"
                      : generationError.code === "CONTENT_BLOCKED"
                        ? "text-destructive"
                        : "text-muted-foreground"
                  )}
                  aria-hidden="true"
                />
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-medium">
                    {generationError.retryable
                      ? "Service temporarily unavailable"
                      : generationError.code === "CONTENT_BLOCKED"
                        ? "Prompt blocked by safety filters"
                        : "Image generation failed"}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {generationError.message}
                  </p>
                  {generationError.retryable && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                      ✓ No credits were used — you can try again freely.
                    </p>
                  )}
                </div>
              </div>
              {(generationError.retryable || generationError.code === "CONTENT_BLOCKED") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { void handleGenerate(); }}
                  className="w-full"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-2" />
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
              <Button onClick={() => { void handleGenerate(); }} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : generationError ? (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Try Again
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleRegenerate}
                disabled={isGenerating}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
              <Button onClick={handleAttach} disabled={isGenerating}>
                <Check className="h-4 w-4 mr-2" />
                Attach to Tweet
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
