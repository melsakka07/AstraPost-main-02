"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Youtube, Loader2 } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────

export interface YoutubeUrlSubmitData {
  youtubeUrl: string;
  provider: "deepgram" | "whisper";
  language: "ar" | "en";
  tweetCount: number;
  tone: string;
}

interface YoutubeUrlInputProps {
  onSubmit: (data: YoutubeUrlSubmitData) => void;
  isLoading: boolean;
  includeFirstTweetImage: boolean;
  onIncludeFirstTweetImageChange: (val: boolean) => void;
  imageQuotaExhausted: boolean;
  /**
   * Optional deep-link URL (from `?url=` on the discover flow). When provided,
   * prefills the input and auto-runs the free preview on mount. Additive — no
   * behavior change when absent.
   */
  initialUrl?: string;
}

interface VideoPreview {
  videoTitle: string;
  durationSeconds: number;
  thumbnailUrl: string;
}

const TONE_OPTIONS = ["professional", "educational", "casual", "formal", "enthusiastic"] as const;

// ── Component ──────────────────────────────────────────────────────────

export function YoutubeUrlInput({
  onSubmit,
  isLoading,
  includeFirstTweetImage,
  onIncludeFirstTweetImageChange,
  imageQuotaExhausted,
  initialUrl,
}: YoutubeUrlInputProps) {
  const t = useTranslations("ai_hub");
  const YT_NS = "youtube_to_thread.";
  const yt = useCallback(
    (key: string, values?: Record<string, string | number>) =>
      key
        ? (t((YT_NS + key) as Parameters<typeof t>[0], values as Parameters<typeof t>[1]) as string)
        : "",
    [t]
  );
  const locale = useLocale();

  const toneLabels: Record<string, string> = {
    professional: yt("options.tone_professional"),
    educational: yt("options.tone_educational"),
    casual: yt("options.tone_casual"),
    formal: yt("options.tone_formal"),
    enthusiastic: yt("options.tone_enthusiastic"),
  };

  const [youtubeUrl, setYoutubeUrl] = useState(initialUrl ?? "");
  const [provider, setProvider] = useState<"deepgram" | "whisper">("deepgram");
  const [language, setLanguage] = useState<"ar" | "en">(locale === "ar" ? "ar" : "en");
  const [tweetCount, setTweetCount] = useState(8);
  const [tone, setTone] = useState<string>("casual");
  const [capabilities, setCapabilities] = useState<{ deepgram: boolean; whisper: boolean } | null>(
    null
  );
  const [urlError, setUrlError] = useState("");
  const [preview, setPreview] = useState<VideoPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [quotaUsed, setQuotaUsed] = useState<number | null>(null);
  const [quotaLimit, setQuotaLimit] = useState<number | null>(null);

  const validatePreview = useCallback(
    async (urlOverride?: string) => {
      const trimmed = (urlOverride ?? youtubeUrl).trim();
      if (!trimmed) {
        setPreview(null);
        return;
      }

      setIsPreviewLoading(true);
      try {
        const res = await fetch("/api/ai/youtube-to-thread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            youtubeUrl: trimmed,
            provider,
            language,
            tweetCount,
            previewOnly: true,
          }),
        });

        if (!res.ok) {
          setPreview(null);
          return;
        }

        const data = (await res.json()) as VideoPreview;
        setPreview(data);
      } catch {
        setPreview(null);
      } finally {
        setIsPreviewLoading(false);
      }
    },
    [youtubeUrl, provider, language, tweetCount]
  );

  // Deep-link (?url=): auto-run the free preview once on mount when an initial
  // URL was provided. Runs only when initialUrl is non-empty; manual-paste flow
  // is unaffected.
  const didAutoPreviewRef = useRef(false);
  useEffect(() => {
    const trimmed = (initialUrl ?? "").trim();
    if (!trimmed || didAutoPreviewRef.current) return;
    didAutoPreviewRef.current = true;
    void validatePreview(trimmed);
  }, [initialUrl, validatePreview]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    void fetch("/api/billing/usage", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!payload) return;
        const usage = payload as {
          limits?: { aiGenerationsPerMonth?: number | null };
          usage?: { ai?: number };
        };

        const limit = usage.limits?.aiGenerationsPerMonth ?? null;
        const used = usage.usage?.ai ?? 0;

        setQuotaLimit(limit);
        setQuotaUsed(used);
      })
      .catch(() => {});

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  // Fetch provider capabilities on mount
  useEffect(() => {
    const ac = new AbortController();
    const timeoutId = setTimeout(() => ac.abort(), 8000);
    fetch("/api/ai/youtube-to-thread/capabilities", { signal: ac.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.providers) setCapabilities(data.providers);
      })
      .catch(() => {});
    return () => {
      clearTimeout(timeoutId);
      ac.abort();
    };
  }, []);

  // Auto-select available provider when capabilities load
  useEffect(() => {
    if (!capabilities) return;
    if (!capabilities.deepgram && provider === "deepgram") setProvider("whisper");
    if (!capabilities.whisper && provider === "whisper") setProvider("deepgram");
  }, [capabilities, provider]);

  const formattedDuration = useMemo(() => {
    if (!preview) return "";
    const minutes = Math.floor(preview.durationSeconds / 60);
    const seconds = preview.durationSeconds % 60;
    return yt("url_input.preview_duration", { minutes, seconds });
  }, [preview, yt]);

  const handleSubmit = () => {
    // Validate URL
    const trimmed = youtubeUrl.trim();
    if (!trimmed) {
      setUrlError(yt("url_input.invalid"));
      return;
    }
    setUrlError("");

    onSubmit({ youtubeUrl: trimmed, provider, language, tweetCount, tone });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-5">
      {/* YouTube URL Input */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
              <Youtube className="text-primary h-4 w-4" />
            </div>
            <CardTitle className="text-base">{yt("url_input.label")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="youtube-url" className="sr-only">
              {yt("url_input.label")}
            </Label>
            <Input
              id="youtube-url"
              type="url"
              placeholder={yt("url_input.placeholder")}
              value={youtubeUrl}
              onChange={(e) => {
                setYoutubeUrl(e.target.value);
                setPreview(null);
                if (urlError) setUrlError("");
              }}
              onBlur={() => {
                void validatePreview();
              }}
              onPaste={(e) => {
                const input = e.currentTarget;
                setTimeout(() => {
                  void validatePreview(input.value);
                }, 0);
              }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className={cn(urlError && "border-destructive")}
              dir="ltr"
            />
            {!youtubeUrl.trim() && !isLoading && (
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs"
                onClick={() => {
                  const sample = "https://www.youtube.com/watch?v=qW1_A9zOHmI";
                  setYoutubeUrl(sample);
                  setUrlError("");
                  void validatePreview(sample);
                }}
              >
                {yt("url_input.try_sample")}
              </Button>
            )}
            {isPreviewLoading && (
              <p className="text-muted-foreground text-xs">{yt("actions.submitting")}</p>
            )}
            {preview && (
              <div className="bg-muted/40 flex gap-3 rounded-md border p-2.5">
                <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded">
                  <Image
                    src={preview.thumbnailUrl}
                    alt={preview.videoTitle}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="line-clamp-2 text-sm font-medium">{preview.videoTitle}</p>
                  <p className="text-muted-foreground text-xs">{formattedDuration}</p>
                  {preview.durationSeconds > 900 && (
                    <p className="text-warning-9 text-xs">{yt("url_input.long_video_warning")}</p>
                  )}
                </div>
              </div>
            )}
            {urlError && (
              <p className="text-destructive text-xs" role="alert">
                {urlError}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{yt("options.heading")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Provider */}
          <div className="space-y-2">
            <Label htmlFor="provider-select" className="text-sm">
              {yt("options.provider")}
            </Label>
            <Select
              value={provider}
              onValueChange={(val) => setProvider(val as "deepgram" | "whisper")}
              disabled={isLoading}
            >
              <SelectTrigger id="provider-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {capabilities?.deepgram !== false && (
                  <SelectItem value="deepgram">{yt("options.provider_deepgram")}</SelectItem>
                )}
                {capabilities?.whisper !== false && (
                  <SelectItem value="whisper">{yt("options.provider_whisper")}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <Label htmlFor="language-select" className="text-sm">
              {yt("options.language")}
            </Label>
            <Select
              value={language}
              onValueChange={(val) => setLanguage(val as "ar" | "en")}
              disabled={isLoading}
            >
              <SelectTrigger id="language-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">{yt("options.language_ar")}</SelectItem>
                <SelectItem value="en">{yt("options.language_en")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tweet Count */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="tweet-count-slider" className="text-sm">
                {yt("options.tweet_count")}
              </Label>
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  isLoading ? "text-muted-foreground" : "text-brand-9"
                )}
              >
                {tweetCount}
              </span>
            </div>
            <Slider
              id="tweet-count-slider"
              min={3}
              max={15}
              step={1}
              value={[tweetCount]}
              onValueChange={([val]) => val !== undefined && setTweetCount(val)}
              disabled={isLoading}
              aria-label={yt("options.tweet_count")}
            />
            <div className="text-muted-foreground flex justify-between text-[10px]">
              <span>3</span>
              <span>15</span>
            </div>
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <Label htmlFor="tone-select" className="text-sm">
              {yt("options.tone")}
            </Label>
            <Select value={tone} onValueChange={setTone} disabled={isLoading}>
              <SelectTrigger id="tone-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((toneKey) => (
                  <SelectItem key={toneKey} value={toneKey}>
                    {toneLabels[toneKey]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* First-tweet image toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">{yt("options.include_first_tweet_image")}</p>
              <p className="text-muted-foreground text-xs">
                {yt("options.include_first_tweet_image_description")}
              </p>
            </div>
            <Switch
              id="youtube-include-first-tweet-image"
              checked={includeFirstTweetImage}
              onCheckedChange={onIncludeFirstTweetImageChange}
              disabled={isLoading || imageQuotaExhausted}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-xs">
          {quotaUsed === null
            ? ""
            : quotaLimit === null
              ? yt("url_input.quota_remaining_unlimited", { used: quotaUsed })
              : yt("url_input.quota_remaining", { used: quotaUsed, limit: quotaLimit })}
        </p>
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="min-w-[160px] gap-2"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {yt("actions.submitting")}
            </>
          ) : (
            yt("actions.submit")
          )}
        </Button>
      </div>
    </div>
  );
}
