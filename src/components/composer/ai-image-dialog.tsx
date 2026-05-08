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
import { useTranslations, useLocale } from "next-intl";
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
  attachedCount: number;
}

const ASPECT_RATIO_CLASSES: Record<AspectRatio, string> = {
  "1:1": "aspect-square",
  "16:9": "aspect-video",
  "4:3": "aspect-[4/3]",
  "9:16": "aspect-[9/16]",
};

const STYLE_OPTIONS: Array<{ value: ImageStyle; emoji: string }> = [
  { value: "photorealistic", emoji: "📷" },
  { value: "illustration", emoji: "🎨" },
  { value: "minimalist", emoji: "✨" },
  { value: "abstract", emoji: "🔮" },
  { value: "infographic", emoji: "📊" },
  { value: "meme", emoji: "😄" },
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
  const locale = useLocale();
  const isRtl = locale === "ar";
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

  const [generationError, setGenerationError] = useState<{
    message: string;
    retryable: boolean;
    code: string;
  } | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePollingIdRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);

  const ESTIMATED_DURATION_MS = 15_000;
  const LONG_WAIT_THRESHOLD_MS = 25_000;
  const [progressPercent, setProgressPercent] = useState(0);
  const [isLongWait, setIsLongWait] = useState(false);
  const generationStartRef = useRef<number | null>(null);
  const progressRafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  const startProgressAnimation = useCallback(() => {
    generationStartRef.current = Date.now();
    setProgressPercent(0);
    setIsLongWait(false);

    const tick = () => {
      if (!generationStartRef.current) return;
      const elapsed = Date.now() - generationStartRef.current;
      const ratio = Math.min(elapsed / ESTIMATED_DURATION_MS, 1);
      const eased = 1 - Math.pow(1 - ratio, 2);
      const pct = Math.min(Math.round(eased * 90), 90);
      setProgressPercent(pct);

      if (elapsed >= LONG_WAIT_THRESHOLD_MS) {
        setIsLongWait(true);
      }

      if (elapsed < ESTIMATED_DURATION_MS * 3) {
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

  useEffect(() => {
    return () => {
      stopProgressAnimation();
    };
  }, [stopProgressAnimation]);

  const cancelPolling = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    activePollingIdRef.current = null;
    stopProgressAnimation();
  };

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

  function pollForResult(predictionId: string) {
    pollTimerRef.current = setTimeout(async () => {
      if (activePollingIdRef.current !== predictionId) return;

      try {
        const res = await fetch(`/api/ai/image/status?id=${predictionId}`);
        const data = await res.json();

        if (!res.ok) {
          const code: string = data.code ?? "GENERATION_FAILED";
          const retryable: boolean = data.retryable === true;

          if (retryable && retryCountRef.current < 1) {
            retryCountRef.current += 1;
            setIsGenerating(false);
            activePollingIdRef.current = null;
            toast.info(t("service_busy"), { duration: 3000 });
            pollTimerRef.current = setTimeout(() => {
              void handleGenerate();
            }, 3500);
            return;
          }

          stopProgressAnimation();
          setGenerationError({
            message: data.error || t("error_generation_failed"),
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
          const newId: string = data.predictionId;
          activePollingIdRef.current = newId;
          toast.info(t("switching_model"), { duration: 3000 });
          pollForResult(newId);
        } else if (data.status === "succeeded") {
          stopProgressAnimation();
          setProgressPercent(100);
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
          message: t("network_error"),
          retryable: true,
          code: "NETWORK_ERROR",
        });
        setIsGenerating(false);
        activePollingIdRef.current = null;
      }
    }, 2000);
  }

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
    startProgressAnimation();

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
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="w-full min-w-0 space-y-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-x-2 text-sm">
            <span className="text-muted-foreground shrink-0">{t("monthly_quota")}</span>
            <span
              className={cn(
                "min-w-0 truncate font-medium",
                remainingQuota <= 3
                  ? "text-destructive"
                  : remainingQuota <= 10
                    ? "text-orange-500"
                    : "text-green-600"
              )}
            >
              {remainingQuota === -1
                ? t("unlimited")
                : t("remaining_quota", { count: remainingQuota })}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">{t("image_prompt")}</Label>
            <Textarea
              id="prompt"
              autoFocus
              dir={isRtl ? "rtl" : "ltr"}
              placeholder={
                tweetContent
                  ? t("prompt_placeholder_from_tweet", {
                      content: `${tweetContent.slice(0, 100)}${tweetContent.length > 100 ? "..." : ""}`,
                    })
                  : t("prompt_placeholder_empty")
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className={cn("min-h-[80px] resize-none", isRtl && "text-right")}
              disabled={isGenerating}
            />
            {!prompt && tweetContent && (
              <p className="text-muted-foreground text-xs">
                <Sparkles className="mr-1 inline h-3 w-3" />
                {t("auto_generate_hint")}
              </p>
            )}
          </div>

          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="model">{t("model")}</Label>
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
                          {t(`model_${m}`)}
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
                  {t("locked_model_hint")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="aspectRatio">{t("aspect_ratio")}</Label>
              <Select
                value={aspectRatio}
                onValueChange={(value) => setAspectRatio(value as AspectRatio)}
                disabled={isGenerating}
              >
                <SelectTrigger id="aspectRatio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ASPECT_RATIO_CLASSES) as AspectRatio[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`aspect_ratio_labels.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("style_optional")}</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={style === undefined ? "default" : "outline"}
                size="sm"
                onClick={() => setStyle(undefined)}
                disabled={isGenerating}
              >
                {t("style_none")}
              </Button>
              {STYLE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={style === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStyle(option.value)}
                  disabled={isGenerating}
                >
                  {option.emoji} {t(`style_${option.value}`)}
                </Button>
              ))}
            </div>
          </div>

          {generatedImage && (
            <div className="space-y-3">
              <Label>{t("generated_image")}</Label>
              <div className="bg-muted relative overflow-hidden rounded-lg border">
                <div
                  className={cn(
                    "relative w-full",
                    ASPECT_RATIO_CLASSES[aspectRatio],
                    "max-h-[360px] max-sm:max-h-[240px]"
                  )}
                >
                  <Image
                    src={generatedImage.imageUrl}
                    alt={t("generated_image")}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 512px"
                  />
                </div>
                <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <p className="line-clamp-2 text-xs text-white">{generatedImage.prompt}</p>
                </div>
              </div>

              {imageHistory.length > 1 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">
                    {t("history", { count: imageHistory.length })}
                  </Label>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {imageHistory.map((img, idx) => (
                      <button
                        key={`${img.imageUrl}-${idx}`}
                        onClick={() => handleSelectHistoryImage(img)}
                        aria-label={t("select_image", { index: idx + 1 })}
                        className={cn(
                          "relative h-16 w-16 flex-shrink-0 overflow-hidden rounded border-2",
                          generatedImage.imageUrl === img.imageUrl
                            ? "border-primary"
                            : "border-muted"
                        )}
                      >
                        <Image
                          src={img.imageUrl}
                          alt={t("select_image", { index: idx + 1 })}
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

          {isGenerating && (
            <div role="status" aria-label={t("generating_aria")} className="space-y-4 py-4">
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
                    {isLongWait ? t("taking_longer") : t("generating_status")}
                  </span>
                  <span>{progressPercent}%</span>
                </div>
              </div>
              <p className="text-muted-foreground/70 text-center text-xs">
                {isLongWait ? t("still_working") : t("usually_takes")}
              </p>
            </div>
          )}

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
                      ? t("error_service_unavailable")
                      : generationError.code === "CONTENT_BLOCKED"
                        ? t("error_content_blocked")
                        : t("error_generation_failed")}
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {generationError.message}
                  </p>
                  {generationError.retryable && (
                    <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
                      {t("no_credits_used")}
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
                    ? t("try_adjusted_prompt")
                    : t("try_again")}
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {!generatedImage ? (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isGenerating}
              >
                {t("cancel")}
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
                    {t("generating")}
                  </>
                ) : generationError ? (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {t("try_again")}
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    {t("generate")}
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleRegenerate} disabled={isGenerating}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("regenerate")}
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
                      {t("downloading")}
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      {t("download")}
                    </>
                  )}
                </Button>
              )}
              <Button onClick={handleAttach} disabled={isGenerating || attachedCount >= 4}>
                <Check className="mr-2 h-4 w-4" />
                {attachedCount >= 4
                  ? t("max_images_reached")
                  : attachedCount > 0
                    ? t("attach_to_tweet_count", { count: attachedCount })
                    : t("attach_to_tweet")}
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
