"use client";

import React, { useEffect, useRef } from "react";
import {
  FileText,
  Globe,
  Hash,
  LayoutTemplate,
  Lightbulb,
  Loader2,
  Megaphone,
  RefreshCw,
  Sparkles,
  Target,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { AiLengthSelector } from "@/components/composer/ai-length-selector";
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { XSubscriptionTier } from "@/components/ui/x-subscription-badge";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { OutputFormat, TemplatePromptConfig } from "@/lib/ai/template-prompts";
import { LANGUAGES } from "@/lib/constants";

// Phase 2: Format options for template generation
const FORMAT_OPTIONS: { value: OutputFormat; label: string }[] = [
  { value: "single", label: "Single Tweet" },
  { value: "thread-short", label: "Thread (3–5)" },
  { value: "thread-long", label: "Thread (5–10)" },
];

export type AiToolType =
  | "thread"
  | "inspire"
  | "template"
  | "hook"
  | "cta"
  | "rewrite"
  | "translate"
  | "hashtags";

interface TweetLike {
  id: string;
  content: string;
}

const NICHES = [
  "Technology",
  "Business",
  "Marketing",
  "Lifestyle",
  "Health & Fitness",
  "Education",
  "Finance",
  "Entertainment",
  "Productivity",
  "Self Improvement",
];

const TOOLS: {
  id: AiToolType;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "thread", label: "Write", Icon: Sparkles },
  { id: "inspire", label: "Inspire", Icon: Lightbulb },
  { id: "template", label: "Template", Icon: FileText },
  { id: "hook", label: "Hook", Icon: Zap },
  { id: "cta", label: "CTA", Icon: Megaphone },
  { id: "rewrite", label: "Rewrite", Icon: Wand2 },
  { id: "translate", label: "Translate", Icon: Globe },
  { id: "hashtags", label: "#Tags", Icon: Hash },
];

const TOOL_DESCRIPTIONS: Record<AiToolType, string> = {
  thread: "ai_tools.description.thread",
  inspire: "ai_tools.description.inspire",
  template: "ai_tools.description.template",
  hook: "ai_tools.description.hook",
  cta: "ai_tools.description.cta",
  rewrite: "ai_tools.description.rewrite",
  translate: "ai_tools.description.translate",
  hashtags: "ai_tools.description.hashtags",
};

interface AiToolsPanelProps {
  aiTool: AiToolType;
  onToolChange: (tool: AiToolType) => void;
  aiTopic: string;
  onTopicChange: (v: string) => void;
  aiTone: string;
  onToneChange: (v: string) => void;
  aiLanguage: string;
  onLanguageChange: (v: string) => void;
  aiCount: number[];
  onCountChange: (v: number[]) => void;
  aiAddNumbering: boolean;
  onAddNumberingChange: (v: boolean) => void;
  aiLengthOption: "short" | "medium" | "long";
  onLengthOptionChange: (v: "short" | "medium" | "long") => void;
  selectedTier: XSubscriptionTier | null | undefined;
  tweets: TweetLike[];
  aiRewriteText: string;
  onRewriteTextChange: (v: string) => void;
  aiTranslateTarget: string;
  onTranslateTargetChange: (v: string) => void;
  aiTargetTweetId: string | null;
  isGenerating: boolean;
  streamingTweetCount?: number;
  totalTweetCount?: number;
  onGenerate: () => void;
  onClose: () => void;
  hideActions?: boolean;
  // Phase 1: Inspiration props
  inspirationTopics: Array<{ topic: string; hook: string }>;
  inspirationNiche: string;
  isLoadingInspiration: boolean;
  onInspirationNicheChange: (v: string) => void;
  onFetchInspiration: () => void;
  onInspirationSelect: (topic: string, hook: string) => void;
  // Phase 2: Template props
  templateConfig: TemplatePromptConfig | null;
  templateFormat: OutputFormat;
  onTemplateFormatChange: (v: OutputFormat) => void;
  onClearTemplate: () => void;
  // Phase 3: Hashtag chips props
  generatedHashtags: string[];
  onHashtagClick: (tag: string) => void;
  onHashtagsDone: () => void;
  onBrowseTemplates?: () => void;
  isAiOpen: boolean;
}

export function AiToolsPanel({
  aiTool,
  onToolChange,
  aiTopic,
  onTopicChange,
  aiTone,
  onToneChange,
  aiLanguage,
  onLanguageChange,
  aiCount,
  onCountChange,
  aiAddNumbering,
  onAddNumberingChange,
  aiLengthOption,
  onLengthOptionChange,
  selectedTier,
  tweets,
  aiRewriteText,
  onRewriteTextChange,
  aiTranslateTarget,
  onTranslateTargetChange,
  aiTargetTweetId,
  isGenerating,
  streamingTweetCount,
  totalTweetCount,
  onGenerate,
  onClose,
  hideActions,
  // Phase 1: Inspiration props
  inspirationTopics,
  inspirationNiche,
  isLoadingInspiration,
  onInspirationNicheChange,
  onFetchInspiration,
  onInspirationSelect,
  // Phase 2: Template props
  templateConfig,
  templateFormat,
  onTemplateFormatChange,
  onClearTemplate,
  // Phase 3: Hashtag chips props
  generatedHashtags,
  onHashtagClick,
  onHashtagsDone,
  onBrowseTemplates,
  isAiOpen,
}: AiToolsPanelProps) {
  const t = useTranslations("compose");
  const bt = useTranslations("buttons");
  const isStreamingThread =
    isGenerating && aiTool === "thread" && typeof streamingTweetCount === "number";

  // Phase 4: Per-tool tone memory using localStorage
  useEffect(() => {
    const STORAGE_KEY = "astra-ai-tone-prefs";
    const loadToneForTool = (tool: AiToolType): string => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const prefs = JSON.parse(stored) as Record<string, string>;
          return prefs[tool] || "professional"; // Default fallback
        }
      } catch {
        // Ignore errors
      }
      return "professional";
    };

    // Load saved tone when tool changes
    const savedTone = loadToneForTool(aiTool);
    if (savedTone !== aiTone) {
      onToneChange(savedTone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only run when tool changes, not when tone/onToneChange changes
  }, [aiTool]);

  // Save tone preference when it changes
  useEffect(() => {
    const STORAGE_KEY = "astra-ai-tone-prefs";
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const prefs = stored ? JSON.parse(stored) : {};
      prefs[aiTool] = aiTone;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore errors
    }
  }, [aiTone, aiTool, onToneChange]);

  // Auto-dismiss hashtags when all chips are consumed
  const prevHashtagsLengthRef = useRef(generatedHashtags.length);
  useEffect(() => {
    if (
      aiTool === "hashtags" &&
      prevHashtagsLengthRef.current > 0 &&
      generatedHashtags.length === 0
    ) {
      onHashtagsDone();
    }
    prevHashtagsLengthRef.current = generatedHashtags.length;
  }, [generatedHashtags.length, aiTool, onHashtagsDone]);

  const isDesktop = useMediaQuery("(min-width: 768px)");

  const isGenerateDisabled =
    aiTool === "inspire" ||
    isGenerating ||
    (aiTool === "thread" && !aiTopic) ||
    (aiTool === "template" && templateConfig && !aiTopic) ||
    (aiTool === "template" && !templateConfig) ||
    (aiTool === "hook" && !aiTopic && !(tweets[0]?.content || "").trim()) ||
    (aiTool === "rewrite" && !aiRewriteText.trim()) ||
    (aiTool === "translate" && !tweets.some((t) => t.content.trim())) ||
    (aiTool === "hashtags" &&
      !(tweets.find((t) => t.id === aiTargetTweetId)?.content ?? "").trim());

  return (
    <div className="space-y-4">
      {/* Tool tab switcher — grid on mobile (all 8 visible), flex-wrap on desktop */}
      <TooltipProvider>
        <div
          role="tablist"
          aria-label="AI tool"
          className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:gap-2"
        >
          {TOOLS.map(({ id, label, Icon }) => {
            const button = (
              <button
                role="tab"
                aria-selected={aiTool === id}
                type="button"
                disabled={isGenerating}
                onClick={() => onToolChange(id)}
                className="focus-visible:border-ring focus-visible:ring-ring/50 aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:hover:bg-primary/90 bg-background hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 inline-flex h-9 min-w-[44px] shrink-0 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 sm:h-8 sm:min-w-0 sm:gap-2 sm:px-3 sm:text-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
              >
                <Icon className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                <span className="xs:inline hidden">{label}</span>
              </button>
            );

            // Tooltips only on desktop — hover tooltips don't work on touch devices
            if (!isDesktop) return <React.Fragment key={id}>{button}</React.Fragment>;

            return (
              <Tooltip key={id}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent>{t(`ai_tools.tooltip.${id}`)}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {/* Active tool description */}
      {isAiOpen && !isGenerating && (
        <p className="text-muted-foreground text-xs leading-relaxed sm:text-sm">
          {t(TOOL_DESCRIPTIONS[aiTool])}
        </p>
      )}

      {/* Phase 3: Scope indicator - shows which tweets are affected */}
      {isAiOpen && !isGenerating && (
        <div className="bg-primary/5 border-primary/10 text-primary/80 flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs sm:gap-2 sm:px-2.5 sm:text-sm">
          <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {(() => {
            const nonEmptyCount = tweets.filter((t) => t.content.trim()).length;
            if (aiTool === "thread" || aiTool === "inspire" || aiTool === "template") {
              return `Affects: All ${tweets.length} tweet${tweets.length !== 1 ? "s" : ""}`;
            }
            if (aiTool === "hook" || aiTool === "rewrite" || aiTool === "hashtags") {
              const targetIndex = tweets.findIndex((t) => t.id === aiTargetTweetId);
              return targetIndex >= 0
                ? `Affects: Tweet #${targetIndex + 1}`
                : "Affects: No tweet selected";
            }
            if (aiTool === "cta") {
              return "Appends to: Last tweet";
            }
            if (aiTool === "translate") {
              return `Affects: ${nonEmptyCount} non-empty tweet${nonEmptyCount !== 1 ? "s" : ""}`;
            }
            return null;
          })()}
        </div>
      )}

      {/* P2-F / P4-A: Streaming progress state — shown during thread generation */}
      {isStreamingThread && (
        <div className="space-y-3 py-2 sm:space-y-4">
          <div className="text-muted-foreground flex items-center gap-2 text-sm sm:gap-3 sm:text-base">
            {/* P4-A: aria-hidden spinner — status text below is the announcement */}
            <Loader2
              className="text-primary h-4 w-4 shrink-0 animate-spin sm:h-5 sm:w-5"
              aria-hidden="true"
            />
            {/* P4-A: aria-live="polite" + role="status" announces streaming progress to screen readers */}
            <span role="status" aria-live="polite" aria-atomic="true">
              {streamingTweetCount === 0
                ? "Starting generation…"
                : `Generated ${streamingTweetCount}${totalTweetCount ? ` of ${totalTweetCount}` : ""} tweet${streamingTweetCount !== 1 ? "s" : ""}…`}
            </span>
          </div>
          {typeof totalTweetCount === "number" && totalTweetCount > 0 && (
            <div
              role="progressbar"
              aria-valuenow={streamingTweetCount ?? 0}
              aria-valuemin={0}
              aria-valuemax={totalTweetCount}
              aria-label={`Thread generation progress: ${streamingTweetCount} of ${totalTweetCount} tweets`}
              className="bg-muted h-2 overflow-hidden rounded-full sm:h-2.5"
            >
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(((streamingTweetCount ?? 0) / totalTweetCount) * 100, 100)}%`,
                }}
              />
            </div>
          )}
          <p className="text-muted-foreground text-xs sm:text-sm">
            Tweets are streaming into the composer below.
          </p>
        </div>
      )}

      {/* Form fields — hidden while thread is actively streaming */}
      {!isStreamingThread && (
        <>
          {/* Form fields */}
          {(aiTool === "thread" || aiTool === "hook") && (
            <div className="space-y-2">
              <Label className="text-sm">Topic</Label>
              <Input
                placeholder="e.g. Productivity tips for developers"
                value={aiTopic}
                onChange={(e) => onTopicChange(e.target.value)}
                className="h-11 text-sm sm:h-10"
              />
            </div>
          )}

          {aiTool === "rewrite" && (
            <div className="space-y-2">
              <Label className="text-sm">Tweet</Label>
              <Textarea
                value={aiRewriteText}
                onChange={(e) => onRewriteTextChange(e.target.value)}
                className="min-h-[120px] text-sm sm:min-h-[140px]"
                placeholder="Enter or paste the tweet text you want to rewrite..."
              />
              {!aiRewriteText.trim() && (
                <p className="text-muted-foreground text-xs italic sm:text-sm">
                  Enter text above to enable rewrite
                </p>
              )}
            </div>
          )}

          {aiTool === "hashtags" && (
            <div className="space-y-3 sm:space-y-4">
              <Label className="text-sm">Tweet content</Label>
              <div className="bg-muted/30 min-h-[60px] rounded-md border px-3 py-2.5 text-sm">
                {tweets.find((t) => t.id === aiTargetTweetId)?.content || (
                  <span className="text-muted-foreground text-xs italic sm:text-sm">
                    No content yet — type something in the tweet editor first
                  </span>
                )}
              </div>

              {/* Phase 3: Show hashtag chips inline in panel */}
              {generatedHashtags.length > 0 && (
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs sm:text-sm">Generated hashtags (click to add):</Label>
                    <span className="text-muted-foreground text-xs">
                      {generatedHashtags.length} remaining
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {generatedHashtags.map((tag) => (
                      <Button
                        key={tag}
                        variant="outline"
                        size="sm"
                        className="h-8 min-w-[44px] px-3 text-xs sm:h-7 sm:min-w-0 sm:px-2.5"
                        onClick={() => onHashtagClick(tag)}
                      >
                        {tag}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-10 w-full text-sm sm:h-9"
                    onClick={onHashtagsDone}
                  >
                    <X className="mr-1 h-4 w-4" />
                    {t("ai_tools.hashtags.dismiss")}
                  </Button>
                </div>
              )}
            </div>
          )}

          {aiTool === "translate" && (
            <div className="space-y-2">
              <Label className="text-sm">Translate to</Label>
              <Select value={aiTranslateTarget} onValueChange={onTranslateTargetChange}>
                <SelectTrigger className="h-11 text-sm sm:h-10">
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
              <p className="text-muted-foreground text-xs sm:text-sm">
                Source language is auto-detected
              </p>
              {!tweets.some((t) => t.content.trim()) && (
                <p className="text-muted-foreground text-xs italic sm:text-sm">
                  Add content to your tweet(s) to enable translation
                </p>
              )}
            </div>
          )}

          {aiTool === "inspire" && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-end gap-2 sm:gap-3">
                <div className="flex-1 space-y-2">
                  <Label className="text-sm">Niche</Label>
                  <Select value={inspirationNiche} onValueChange={onInspirationNicheChange}>
                    <SelectTrigger className="h-11 text-sm sm:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NICHES.map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={onFetchInspiration}
                  disabled={isLoadingInspiration}
                  size="sm"
                  className="h-11 min-w-[44px] px-3 text-sm sm:h-10 sm:min-w-0 sm:px-4"
                >
                  {isLoadingInspiration ? (
                    <Loader2 className="h-4 w-4 animate-spin sm:h-4 sm:w-4" />
                  ) : (
                    <RefreshCw className="h-4 w-4 sm:h-4 sm:w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {inspirationTopics.length > 0 ? "Refresh" : "Get Ideas"}
                  </span>
                  <span className="sm:hidden">
                    {inspirationTopics.length > 0 ? "Refresh" : "Get"}
                  </span>
                </Button>
              </div>

              {inspirationTopics.length > 0 && (
                <div className="max-h-[200px] space-y-2 overflow-y-auto pr-1 sm:max-h-[220px] sm:space-y-3">
                  {inspirationTopics.map((t, i) => (
                    <div
                      key={i}
                      className="hover:bg-muted/50 group cursor-pointer rounded-lg border p-3 transition-colors sm:p-3"
                      onClick={() => onInspirationSelect(t.topic, t.hook)}
                    >
                      <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <h4 className="text-sm font-semibold sm:text-base">{t.topic}</h4>
                        <Sparkles className="text-muted-foreground h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 sm:h-4 sm:w-4" />
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs italic sm:mt-1.5 sm:text-sm">
                        "{t.hook}"
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {inspirationTopics.length === 0 && !isLoadingInspiration && (
                <p className="text-muted-foreground py-2 text-center text-xs sm:py-3 sm:text-sm">
                  Select a niche and click "Get Ideas" to start.
                </p>
              )}
            </div>
          )}

          {aiTool === "template" && !templateConfig && (
            <div className="space-y-3 py-2 sm:space-y-4">
              <div className="bg-muted/30 flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-6 text-center">
                <LayoutTemplate className="text-muted-foreground h-8 w-8 sm:h-10 sm:w-10" />
                <div>
                  <p className="text-sm font-medium">{t("ai_tools.template.select_prompt")}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {t("ai_tools.template.select_description")}
                  </p>
                </div>
                {onBrowseTemplates && (
                  <Button variant="outline" size="sm" onClick={onBrowseTemplates} className="mt-1">
                    <FileText className="mr-1.5 h-4 w-4" />
                    {t("ai_tools.template.browse")}
                  </Button>
                )}
              </div>
            </div>
          )}

          {aiTool === "template" && templateConfig && (
            <div className="space-y-3 sm:space-y-4">
              {/* Template info header */}
              <div className="bg-muted/30 relative flex items-start gap-3 rounded-lg p-3">
                <div className="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
                  <LayoutTemplate className="text-primary h-4 w-4" />
                </div>
                <div className="min-w-0 pr-6">
                  <h3 className="text-sm leading-tight font-semibold sm:text-base">
                    {templateConfig.name}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                    {templateConfig.description}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground absolute top-2 right-2 h-7 w-7"
                  onClick={onClearTemplate}
                  aria-label="Remove template"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Topic input */}
              <div className="space-y-2">
                <Label className="text-sm">Topic</Label>
                <Input
                  placeholder={templateConfig.placeholderTopic}
                  value={aiTopic}
                  onChange={(e) => onTopicChange(e.target.value)}
                  className="h-11 text-sm sm:h-10"
                />
                {!aiTopic.trim() && (
                  <p className="text-muted-foreground text-xs italic sm:text-sm">
                    Enter a topic to enable generation
                  </p>
                )}
              </div>

              {/* Format select */}
              <div className="space-y-2">
                <Label className="text-sm">Format</Label>
                <Select value={templateFormat} onValueChange={onTemplateFormatChange}>
                  <SelectTrigger className="h-11 text-sm sm:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {aiTool !== "inspire" && aiTool !== "template" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Tone</Label>
                <Select value={aiTone} onValueChange={onToneChange}>
                  <SelectTrigger className="h-11 text-sm sm:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="humorous">Funny</SelectItem>
                    <SelectItem value="educational">Educational</SelectItem>
                    <SelectItem value="inspirational">Inspirational</SelectItem>
                    <SelectItem value="viral">Viral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {aiTool !== "translate" && (
                <div className="space-y-2">
                  <Label className="text-sm">Language</Label>
                  <Select value={aiLanguage} onValueChange={onLanguageChange}>
                    <SelectTrigger className="h-11 text-sm sm:h-10">
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
              )}
            </div>
          )}

          {aiTool !== "inspire" &&
            aiTool !== "template" &&
            aiTool === "thread" &&
            tweets.length === 1 && (
              <AiLengthSelector
                selectedLength={aiLengthOption}
                onLengthChange={onLengthOptionChange}
                xSubscriptionTier={selectedTier}
              />
            )}

          {aiTool !== "inspire" &&
            aiTool !== "template" &&
            aiTool === "thread" &&
            tweets.length > 1 && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Length (Tweets)</Label>
                    <span className="text-muted-foreground text-sm">{aiCount[0]}</span>
                  </div>
                  <Slider
                    value={aiCount}
                    onValueChange={onCountChange}
                    min={3}
                    max={15}
                    step={1}
                    className="py-2"
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
                  <Label htmlFor="ai-numbering-panel" className="cursor-pointer text-sm">
                    Add numbering (1/N)
                  </Label>
                  <Switch
                    id="ai-numbering-panel"
                    checked={aiAddNumbering}
                    onCheckedChange={onAddNumberingChange}
                  />
                </div>
              </>
            )}

          {isGenerating && !isStreamingThread && (
            <div className="flex items-center gap-2 py-2 sm:gap-3 sm:py-3">
              <Loader2 className="text-primary h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
              <span
                role="status"
                aria-live="polite"
                className="text-muted-foreground text-xs sm:text-sm"
              >
                {t(`ai_tools.generating.${aiTool}`)}
              </span>
            </div>
          )}

          {!hideActions && aiTool !== "inspire" && (
            <div className="flex justify-end gap-2 border-t pt-3 sm:gap-3 sm:pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isGenerating}
                className="h-10 min-w-[44px] text-sm sm:h-9 sm:min-w-0"
              >
                {bt("cancel")}
              </Button>
              <Button
                size="sm"
                onClick={onGenerate}
                disabled={isGenerateDisabled}
                className="h-10 min-w-[44px] text-sm sm:h-9 sm:min-w-0"
              >
                {isGenerating && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {t("ai_generate")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
