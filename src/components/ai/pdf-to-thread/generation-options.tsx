"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────────────────

const TONE_OPTIONS = ["professional", "educational", "casual", "formal", "enthusiastic"] as const;

// ── Props ──────────────────────────────────────────────────────────────

interface GenerationOptionsProps {
  language: "ar" | "en";
  onLanguageChange: (lang: "ar" | "en") => void;
  tweetCount: number;
  onTweetCountChange: (count: number) => void;
  tone: string;
  onToneChange: (tone: string) => void;
  disabled: boolean;
}

// ── Component ──────────────────────────────────────────────────────────

export function GenerationOptions({
  language,
  onLanguageChange,
  tweetCount,
  onTweetCountChange,
  tone,
  onToneChange,
  disabled,
}: GenerationOptionsProps) {
  const t = useTranslations("ai_hub");

  const toneLabels: Record<(typeof TONE_OPTIONS)[number], string> = {
    professional: t("pdf_to_thread.options.tone_professional"),
    educational: t("pdf_to_thread.options.tone_educational"),
    casual: t("pdf_to_thread.options.tone_casual"),
    formal: t("pdf_to_thread.options.tone_formal"),
    enthusiastic: t("pdf_to_thread.options.tone_enthusiastic"),
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("pdf_to_thread.options.heading")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Language */}
        <div className="space-y-2">
          <Label htmlFor="language-select" className="text-sm">
            {t("pdf_to_thread.options.language")}
          </Label>
          <Select
            value={language}
            onValueChange={(val) => onLanguageChange(val as "ar" | "en")}
            disabled={disabled}
          >
            <SelectTrigger id="language-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ar">{t("pdf_to_thread.options.language_ar")}</SelectItem>
              <SelectItem value="en">{t("pdf_to_thread.options.language_en")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tweet Count Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="tweet-count-slider" className="text-sm">
              {t("pdf_to_thread.options.tweet_count")}
            </Label>
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
                disabled ? "text-muted-foreground" : "text-brand-9"
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
            onValueChange={([val]) => val !== undefined && onTweetCountChange(val)}
            disabled={disabled}
            aria-label={t("pdf_to_thread.options.tweet_count")}
          />
          <div className="text-muted-foreground flex justify-between text-[10px]">
            <span>3</span>
            <span>15</span>
          </div>
        </div>

        {/* Tone */}
        <div className="space-y-2">
          <Label htmlFor="tone-select" className="text-sm">
            {t("pdf_to_thread.options.tone")}
          </Label>
          <Select value={tone} onValueChange={onToneChange} disabled={disabled}>
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
      </CardContent>
    </Card>
  );
}
