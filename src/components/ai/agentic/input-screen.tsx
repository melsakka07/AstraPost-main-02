"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, ChevronDown, Sparkles, Wand2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { XAccountAvatar } from "@/components/ai/agentic/x-account-avatar";
import { AgenticTrendsPanel } from "@/components/ai/agentic-trends-panel";
import { BlurredOverlay } from "@/components/ui/blurred-overlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { XSubscriptionBadge } from "@/components/ui/x-subscription-badge";
import { LANGUAGES, TONE_ENUM } from "@/lib/constants";
import type { XSubscriptionTier } from "@/lib/schemas/common";

const DEFAULT_SUGGESTIONS = [
  "suggestions.coding",
  "suggestions.funding",
  "suggestions.content_creation",
  "suggestions.mena_tech",
  "suggestions.remote_work",
];

export interface AccountInfo {
  id: string;
  username?: string | undefined;
  profileImageUrl?: string | null | undefined;
  subscriptionTier?: XSubscriptionTier | undefined;
}

interface InputScreenProps {
  topic: string;
  setTopic: (v: string) => void;
  onSubmit: (topicOverride?: string) => void;
  onSelectTrend: (topic: string) => void;
  selectedAccount: AccountInfo | undefined;
  accounts: AccountInfo[];
  selectedAccountId: string;
  setSelectedAccountId: (v: string) => void;
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  tone: string;
  setTone: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  includeImages: boolean;
  setIncludeImages: (v: boolean) => void;
  audience: string;
  setAudience: (v: string) => void;
  isEnhancing: boolean;
  onEnhanceTopic: () => void;
  hasVoiceProfile?: boolean;
  isLocked?: boolean;
}

export function InputScreen({
  topic,
  setTopic,
  onSubmit,
  onSelectTrend,
  selectedAccount,
  accounts,
  selectedAccountId,
  setSelectedAccountId,
  showAdvanced,
  setShowAdvanced,
  tone,
  setTone,
  language,
  setLanguage,
  includeImages,
  setIncludeImages,
  audience,
  setAudience,
  isEnhancing,
  onEnhanceTopic,
  hasVoiceProfile = false,
  isLocked = false,
}: InputScreenProps) {
  const t = useTranslations("ai_agentic");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const canSubmit = topic.trim().length >= 3 && !!selectedAccountId;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && canSubmit) onSubmit();
  };

  return (
    <div className="animate-in fade-in mx-auto w-full max-w-2xl space-y-6 py-8 duration-300">
      {/* ── Hero headline ──────────────────────────────────────────────────── */}
      <div className="text-center">
        <div className="mb-4 flex items-center justify-center">
          <div className="from-primary/20 to-primary/5 border-primary/10 flex h-12 w-12 items-center justify-center rounded-2xl border bg-gradient-to-br">
            <Wand2 className="text-primary h-6 w-6" />
          </div>
        </div>
        <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
          {t("input_screen.hero_title")}
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-lg text-center text-base">
          {t("input_screen.hero_description")}
        </p>
      </div>

      <BlurredOverlay
        isLocked={isLocked}
        title={t("pro_feature")}
        description={t("pro_description")}
        className="space-y-6"
      >
        {/* ── Topic input ────────────────────────────────────────────────────── */}
        <div className="relative mt-8 sm:mt-10">
          <textarea
            ref={inputRef}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("input_screen.placeholder")}
            className="border-input bg-background placeholder:text-muted-foreground/60 focus:ring-ring max-h-[10rem] min-h-[8rem] w-full resize-none overflow-y-auto rounded-xl border px-5 py-4 pe-12 text-[15px] leading-relaxed shadow-sm transition-shadow duration-200 outline-none focus:border-transparent focus:shadow-md focus:ring-2 sm:max-h-[12rem]"
            maxLength={500}
            rows={4}
            aria-label={t("input_screen.hero_title")}
          />
          {topic.trim().length > 0 && (
            <button
              type="button"
              onClick={() => setTopic("")}
              className="text-muted-foreground/60 hover:text-muted-foreground focus-visible:ring-ring absolute end-3 top-3 rounded-md p-1 transition-colors focus-visible:ring-2"
              aria-label={t("input_screen.clear")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {topic.trim().length > 0 && (
            <button
              type="button"
              onClick={() => void onEnhanceTopic()}
              disabled={isEnhancing}
              className="border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 absolute start-3 bottom-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Wand2 className={`h-3 w-3 ${isEnhancing ? "animate-spin" : ""}`} />
              {isEnhancing ? t("input_screen.enhancing") : t("input_screen.enhance")}
            </button>
          )}
        </div>

        {/* ── Voice profile indicator ───────────────────────────────────────────── */}
        {hasVoiceProfile && (
          <div className="flex justify-center">
            <div className="bg-success-2 text-success-11 border-success-6 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium">
              <CheckCircle2 className="h-3 w-3" />
              {t("input_screen.voice_profile_active")}
            </div>
          </div>
        )}

        {/* ── Suggestion chips ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {DEFAULT_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setTopic(t(s));
              }}
              className="border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex cursor-pointer items-center rounded-full border px-4 py-2 text-sm transition-colors duration-150 select-none"
            >
              {t(s)}
            </button>
          ))}
        </div>

        {/* ── Generate button ────────────────────────────────────────────────── */}
        <div className="mt-4 flex justify-center">
          <Button
            className="h-12 gap-2 rounded-xl px-10 text-base font-semibold transition-transform active:scale-[0.98]"
            disabled={!canSubmit || isEnhancing}
            onClick={() => onSubmit()}
            aria-label={t("input_screen.generate")}
          >
            <Sparkles className="h-5 w-5" />
            {t("input_screen.generate")}
          </Button>
        </div>

        {/* ── Advanced options ───────────────────────────────────────────────── */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-muted-foreground hover:text-foreground mx-auto flex items-center gap-1.5 text-sm transition-colors"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}
            />
            {t("input_screen.advanced_options")}
          </button>

          {showAdvanced && (
            <div className="border-border bg-muted/30 animate-in fade-in slide-in-from-top-1 mt-4 space-y-4 rounded-xl border p-5 duration-200">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Tone */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="agentic-tone"
                    className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
                  >
                    {t("input_screen.tone")}
                  </Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger id="agentic-tone" className="h-9 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">{t("input_screen.auto_tone")}</SelectItem>
                      {TONE_ENUM.options.map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Language */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="agentic-language"
                    className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
                  >
                    {t("input_screen.language")}
                  </Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="agentic-language" className="h-9 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((l) => (
                        <SelectItem key={l.code} value={l.code}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Include images */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t("input_screen.include_images")}</p>
                  <p className="text-muted-foreground text-xs">
                    {t("input_screen.include_images_description")}
                  </p>
                </div>
                <Switch
                  id="agentic-images"
                  checked={includeImages}
                  onCheckedChange={setIncludeImages}
                />
              </div>

              {/* Audience hint */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="agentic-audience"
                  className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
                >
                  {t("input_screen.audience_hint")} <span className="normal-case">(optional)</span>
                </Label>
                <Input
                  id="agentic-audience"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder={t("input_screen.audience_placeholder")}
                  maxLength={100}
                  className="rounded-lg"
                />
              </div>
            </div>
          )}
        </div>
      </BlurredOverlay>

      {/* ── Trending topics ────────────────────────────────────────────────── */}
      <AgenticTrendsPanel onSelectTrend={onSelectTrend} />

      {/* ── Account selector (bottom — secondary context) ──────────────────── */}
      {accounts.length > 0 && (
        <div className="mt-8 flex justify-center pb-4">
          {accounts.length === 1 ? (
            <div className="border-border bg-muted/30 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm">
              <XAccountAvatar
                username={selectedAccount?.username}
                profileImageUrl={selectedAccount?.profileImageUrl}
                size="sm"
              />
              <span>{t("input_screen.posting_as")}</span>
              <span className="text-foreground font-medium" dir="auto">
                @{selectedAccount?.username}
              </span>
              <XSubscriptionBadge tier={selectedAccount?.subscriptionTier ?? "None"} size="sm" />
            </div>
          ) : (
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="border-border bg-muted/30 text-muted-foreground hover:bg-accent inline-flex h-auto w-auto gap-2 rounded-full border px-4 py-2 text-sm transition-colors">
                <div className="flex items-center gap-2">
                  <XAccountAvatar
                    username={selectedAccount?.username}
                    profileImageUrl={selectedAccount?.profileImageUrl}
                    size="sm"
                  />
                  <span>{t("input_screen.posting_as")}</span>
                  <span className="text-foreground font-medium" dir="auto">
                    @{selectedAccount?.username}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    <div className="flex items-center gap-2">
                      <XAccountAvatar
                        username={acc.username}
                        profileImageUrl={acc.profileImageUrl}
                        size="sm"
                      />
                      <span dir="auto">@{acc.username}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}
