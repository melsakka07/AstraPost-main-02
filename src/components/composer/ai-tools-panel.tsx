"use client";

import { useEffect } from "react";
import { FileText, Globe, Hash, LayoutTemplate, Lightbulb, Loader2, Megaphone, RefreshCw, Sparkles, Target, Wand2, Zap } from "lucide-react";
import { AiLengthSelector } from "@/components/composer/ai-length-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { XSubscriptionTier } from "@/components/ui/x-subscription-badge";
import type { OutputFormat, TemplatePromptConfig } from "@/lib/ai/template-prompts";
import { LANGUAGES } from "@/lib/constants";

// Phase 2: Format options for template generation
const FORMAT_OPTIONS: { value: OutputFormat; label: string }[] = [
  { value: "single", label: "Single Tweet" },
  { value: "thread-short", label: "Thread (3–5)" },
  { value: "thread-long", label: "Thread (5–10)" },
];

export type AiToolType = "thread" | "inspire" | "template" | "hook" | "cta" | "rewrite" | "translate" | "hashtags";

interface TweetLike {
  id: string;
  content: string;
}

const NICHES = [
  "Technology", "Business", "Marketing", "Lifestyle", "Health & Fitness",
  "Education", "Finance", "Entertainment", "Productivity", "Self Improvement"
];

const TOOLS: { id: AiToolType; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "thread", label: "Write", Icon: Sparkles },
  { id: "inspire", label: "Inspire", Icon: Lightbulb },
  { id: "template", label: "Template", Icon: FileText },
  { id: "hook", label: "Hook", Icon: Zap },
  { id: "cta", label: "CTA", Icon: Megaphone },
  { id: "rewrite", label: "Rewrite", Icon: Wand2 },
  { id: "translate", label: "Translate", Icon: Globe },
  { id: "hashtags", label: "#Tags", Icon: Hash },
];

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
  onOpenTemplatesDialog: () => void;
  // Phase 3: Hashtag chips props
  generatedHashtags: string[];
  onHashtagClick: (tag: string) => void;
  onHashtagsDone: () => void;
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
  onOpenTemplatesDialog,
  // Phase 3: Hashtag chips props
  generatedHashtags,
  onHashtagClick,
  onHashtagsDone,
  isAiOpen,
}: AiToolsPanelProps) {
  const isStreamingThread = isGenerating && aiTool === "thread" && typeof streamingTweetCount === "number";

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

  const isGenerateDisabled =
    aiTool === "inspire" ||
    isGenerating ||
    (aiTool === "thread" && !aiTopic) ||
    (aiTool === "template" && templateConfig && !aiTopic) ||
    (aiTool === "template" && !templateConfig) ||
    (aiTool === "hook" && !aiTopic && !(tweets[0]?.content || "").trim()) ||
    (aiTool === "rewrite" && !aiRewriteText.trim()) ||
    (aiTool === "translate" && !tweets.some((t) => t.content.trim())) ||
    (aiTool === "hashtags" && !(tweets.find((t) => t.id === aiTargetTweetId)?.content ?? "").trim());

  return (
    <div className="space-y-4">
      {/* P1-C / P4-D: Tool tab switcher — pill buttons with ARIA tab semantics */}
      <div role="tablist" aria-label="AI tool" className="flex flex-wrap gap-1.5 sm:gap-2">
        {TOOLS.map(({ id, label, Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={aiTool === id}
            type="button"
            disabled={isGenerating}
            onClick={() => onToolChange(id)}
            className="inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 rounded-md gap-1.5 sm:gap-2 text-xs sm:text-sm h-9 sm:h-8 px-2.5 sm:px-3 min-w-[44px] sm:min-w-0 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:hover:bg-primary/90 bg-background hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50"
          >
            <Icon className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
            <span className="hidden xs:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Phase 3: Scope indicator - shows which tweets are affected */}
      {isAiOpen && !isGenerating && (
        <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 sm:gap-2 px-1">
          <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {(() => {
            const nonEmptyCount = tweets.filter(t => t.content.trim()).length;
            if (aiTool === "thread" || aiTool === "inspire" || aiTool === "template") {
              return `Affects: All ${tweets.length} tweet${tweets.length !== 1 ? "s" : ""}`;
            }
            if (aiTool === "hook" || aiTool === "rewrite" || aiTool === "hashtags") {
              const targetIndex = tweets.findIndex(t => t.id === aiTargetTweetId);
              return targetIndex >= 0 ? `Affects: Tweet #${targetIndex + 1}` : "Affects: No tweet selected";
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
        <div className="space-y-3 sm:space-y-4 py-2">
          <div className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base text-muted-foreground">
            {/* P4-A: aria-hidden spinner — status text below is the announcement */}
            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin shrink-0 text-primary" aria-hidden="true" />
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
              className="h-2 sm:h-2.5 bg-muted rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(((streamingTweetCount ?? 0) / totalTweetCount) * 100, 100)}%` }}
              />
            </div>
          )}
          <p className="text-xs sm:text-sm text-muted-foreground">
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
            className="h-11 sm:h-10 text-sm"
          />
        </div>
      )}

      {aiTool === "rewrite" && (
        <div className="space-y-2">
          <Label className="text-sm">Tweet</Label>
          <Textarea
            value={aiRewriteText}
            onChange={(e) => onRewriteTextChange(e.target.value)}
            className="min-h-[120px] sm:min-h-[140px] text-sm"
            placeholder="Enter or paste the tweet text you want to rewrite..."
          />
          {!aiRewriteText.trim() && (
            <p className="text-xs sm:text-sm text-muted-foreground italic">Enter text above to enable rewrite</p>
          )}
        </div>
      )}

      {aiTool === "hashtags" && (
        <div className="space-y-3 sm:space-y-4">
          <Label className="text-sm">Tweet content</Label>
          <div className="rounded-md border bg-muted/30 px-3 py-2.5 text-sm min-h-[60px]">
            {tweets.find((t) => t.id === aiTargetTweetId)?.content || (
              <span className="text-xs sm:text-sm italic text-muted-foreground">
                No content yet — type something in the tweet editor first
              </span>
            )}
          </div>

          {/* Phase 3: Show hashtag chips inline in panel */}
          {generatedHashtags.length > 0 && (
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs sm:text-sm">Generated hashtags (click to add):</Label>
                <span className="text-xs text-muted-foreground">{generatedHashtags.length} remaining</span>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {generatedHashtags.map((tag) => (
                  <Button
                    key={tag}
                    variant="outline"
                    size="sm"
                    className="h-8 sm:h-7 text-xs px-3 sm:px-2.5 min-w-[44px] sm:min-w-0"
                    onClick={() => onHashtagClick(tag)}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full h-10 sm:h-9 text-sm"
                onClick={onHashtagsDone}
              >
                Done
              </Button>
            </div>
          )}
        </div>
      )}

      {aiTool === "translate" && (
        <div className="space-y-2">
          <Label className="text-sm">Translate to</Label>
          <Select value={aiTranslateTarget} onValueChange={onTranslateTargetChange}>
            <SelectTrigger className="h-11 sm:h-10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs sm:text-sm text-muted-foreground">Source language is auto-detected</p>
          {!tweets.some((t) => t.content.trim()) && (
            <p className="text-xs sm:text-sm text-muted-foreground italic">
              Add content to your tweet(s) to enable translation
            </p>
          )}
        </div>
      )}

      {aiTool === "inspire" && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-end gap-2 sm:gap-3">
            <div className="space-y-2 flex-1">
              <Label className="text-sm">Niche</Label>
              <Select value={inspirationNiche} onValueChange={onInspirationNicheChange}>
                <SelectTrigger className="h-11 sm:h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NICHES.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={onFetchInspiration} disabled={isLoadingInspiration} size="sm" className="h-11 sm:h-10 text-sm px-3 sm:px-4 min-w-[44px] sm:min-w-0">
              {isLoadingInspiration ? (
                <Loader2 className="w-4 h-4 sm:w-4 sm:h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 sm:w-4 sm:h-4" />
              )}
              <span className="hidden sm:inline">{inspirationTopics.length > 0 ? "Refresh" : "Get Ideas"}</span>
              <span className="sm:hidden">{inspirationTopics.length > 0 ? "Refresh" : "Get"}</span>
            </Button>
          </div>

          {inspirationTopics.length > 0 && (
            <div className="space-y-2 sm:space-y-3 max-h-[200px] sm:max-h-[220px] overflow-y-auto pr-1">
              {inspirationTopics.map((t, i) => (
                <div
                  key={i}
                  className="p-3 sm:p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                  onClick={() => onInspirationSelect(t.topic, t.hook)}
                >
                  <div className="flex justify-between items-start gap-2 sm:gap-3">
                    <h4 className="font-semibold text-sm sm:text-base">{t.topic}</h4>
                    <Sparkles className="w-4 h-4 sm:w-4 sm:h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground italic mt-1 sm:mt-1.5">"{t.hook}"</p>
                </div>
              ))}
            </div>
          )}

          {inspirationTopics.length === 0 && !isLoadingInspiration && (
            <p className="text-xs sm:text-sm text-muted-foreground text-center py-2 sm:py-3">
              Select a niche and click "Get Ideas" to start.
            </p>
          )}
        </div>
      )}

      {aiTool === "template" && (
        <div className="space-y-3 sm:space-y-4">
          {templateConfig ? (
            <>
              {/* Template info header */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <LayoutTemplate className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold leading-tight">{templateConfig.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">{templateConfig.description}</p>
                </div>
              </div>

              {/* Topic input */}
              <div className="space-y-2">
                <Label className="text-sm">Topic</Label>
                <Input
                  placeholder={templateConfig.placeholderTopic}
                  value={aiTopic}
                  onChange={(e) => onTopicChange(e.target.value)}
                  className="h-11 sm:h-10 text-sm"
                />
                {!aiTopic.trim() && (
                  <p className="text-xs sm:text-sm text-muted-foreground italic">Enter a topic to enable generation</p>
                )}
              </div>

              {/* Format select */}
              <div className="space-y-2">
                <Label className="text-sm">Format</Label>
                <Select value={templateFormat} onValueChange={onTemplateFormatChange}>
                  <SelectTrigger className="h-11 sm:h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            /* No template selected */
            <div className="text-center py-6 sm:py-8">
              <LayoutTemplate className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground/50 mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">Pick a template to get started</p>
              <Button variant="outline" size="sm" onClick={onOpenTemplatesDialog} className="gap-2 h-10 sm:h-9 text-sm min-w-[44px] sm:min-w-0">
                <LayoutTemplate className="h-4 w-4" />
                Browse Templates
              </Button>
            </div>
          )}
        </div>
      )}

      {aiTool !== "inspire" && aiTool !== "template" && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-2">
          <Label className="text-sm">Tone</Label>
          <Select value={aiTone} onValueChange={onToneChange}>
            <SelectTrigger className="h-11 sm:h-10 text-sm">
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
              <SelectTrigger className="h-11 sm:h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      )}

      {aiTool !== "inspire" && aiTool !== "template" && aiTool === "thread" && tweets.length === 1 && (
        <AiLengthSelector
          selectedLength={aiLengthOption}
          onLengthChange={onLengthOptionChange}
          xSubscriptionTier={selectedTier}
        />
      )}

      {aiTool !== "inspire" && aiTool !== "template" && aiTool === "thread" && tweets.length > 1 && (
        <>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm">Length (Tweets)</Label>
              <span className="text-sm text-muted-foreground">{aiCount[0]}</span>
            </div>
            <Slider value={aiCount} onValueChange={onCountChange} min={3} max={15} step={1} className="py-2" />
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <Label htmlFor="ai-numbering-panel" className="text-sm cursor-pointer">Add numbering (1/N)</Label>
            <Switch id="ai-numbering-panel" checked={aiAddNumbering} onCheckedChange={onAddNumberingChange} />
          </div>
        </>
      )}

      {!hideActions && aiTool !== "inspire" && aiTool !== "template" && (
        <div className="flex justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isGenerating} className="h-10 sm:h-9 text-sm min-w-[44px] sm:min-w-0">Cancel</Button>
          <Button size="sm" onClick={onGenerate} disabled={isGenerateDisabled} className="h-10 sm:h-9 text-sm min-w-[44px] sm:min-w-0">
            {isGenerating && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Generate
          </Button>
        </div>
      )}
      </>
      )}
    </div>
  );
}
