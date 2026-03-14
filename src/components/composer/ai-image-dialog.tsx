/**
 * AI Image Dialog Component
 * Dialog for generating AI images to attach to tweets
 */

"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Wand2,
  Loader2,
  Sparkles,
  RefreshCw,
  Check,
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

type ImageModel = "nano-banana-2" | "nano-banana-pro";
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

  // Reset state when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setPrompt("");
      setGeneratedImage(null);
      setImageHistory([]);
    }
    onOpenChange(newOpen);
  };

  // Auto-generate prompt from tweet content if prompt is empty
  const handleGenerate = async () => {
    if (remainingQuota <= 0) {
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

    setIsGenerating(true);

    try {
      const requestBody: {
        prompt?: string;
        tweetContent?: string;
        model: ImageModel;
        aspectRatio: AspectRatio;
        style?: ImageStyle;
      } = {
        model,
        aspectRatio,
      };

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
        if (response.status === 402) {
          // Payment required / quota exceeded
          toast.error(error.error || "Quota exceeded. Please upgrade.", {
            action: {
              label: "Upgrade",
              onClick: () => (window.location.href = "/pricing"),
            },
          });
        } else if (response.status === 429) {
          toast.error("Rate limit exceeded. Please wait a moment.");
        } else {
          toast.error(error.error || "Failed to generate image");
        }
        setIsGenerating(false);
        return;
      }

      const data: GeneratedImage = await response.json();

      setGeneratedImage(data);
      setImageHistory((prev) => [...prev, data]);

      toast.success("Image generated successfully!");
    } catch (error) {
      console.error("AI image generation error:", error);
      toast.error("Failed to generate image. Please try again.");
    } finally {
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
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Generating your image...
              </p>
              <p className="text-xs text-muted-foreground">
                This may take 10-30 seconds
              </p>
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
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
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
