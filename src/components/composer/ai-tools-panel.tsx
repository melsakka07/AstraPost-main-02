"use client";

import { Globe, Hash, Loader2, Megaphone, Sparkles, Wand2, Zap } from "lucide-react";
import { AiLengthSelector } from "@/components/composer/ai-length-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { XSubscriptionTier } from "@/components/ui/x-subscription-badge";
import { LANGUAGES } from "@/lib/constants";

export type AiToolType = "thread" | "hook" | "cta" | "rewrite" | "translate" | "hashtags";

interface TweetLike {
  id: string;
  content: string;
}

const TOOLS: { id: AiToolType; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "thread", label: "Write", Icon: Sparkles },
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
}: AiToolsPanelProps) {
  const isStreamingThread = isGenerating && aiTool === "thread" && typeof streamingTweetCount === "number";
  const isGenerateDisabled =
    isGenerating ||
    (aiTool === "thread" && !aiTopic) ||
    (aiTool === "hook" && !aiTopic && !(tweets[0]?.content || "").trim()) ||
    (aiTool === "rewrite" && !aiRewriteText.trim()) ||
    (aiTool === "translate" && !tweets.some((t) => t.content.trim())) ||
    (aiTool === "hashtags" && !(tweets.find((t) => t.id === aiTargetTweetId)?.content ?? "").trim());

  return (
    <div className="space-y-4">
      {/* P1-C / P4-D: Tool tab switcher — pill buttons with ARIA tab semantics */}
      <div role="tablist" aria-label="AI tool" className="flex flex-wrap gap-1">
        {TOOLS.map(({ id, label, Icon }) => (
          <Button
            key={id}
            role="tab"
            aria-selected={aiTool === id}
            variant={aiTool === id ? "default" : "ghost"}
            size="sm"
            className="gap-1.5 text-xs h-7 px-2.5"
            onClick={() => onToolChange(id)}
            disabled={isGenerating}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </Button>
        ))}
      </div>

      {/* P2-F / P4-A: Streaming progress state — shown during thread generation */}
      {isStreamingThread && (
        <div className="space-y-3 py-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {/* P4-A: aria-hidden spinner — status text below is the announcement */}
            <Loader2 className="h-4 w-4 animate-spin shrink-0 text-primary" aria-hidden="true" />
            {/* P4-A: aria-live="polite" + role="status" announces streaming progress to screen readers */}
            <span role="status" aria-live="polite" aria-atomic="true">
              {streamingTweetCount === 0
                ? "Starting generation…"
                : `Generated ${streamingTweetCount}${totalTweetCount ? ` of ${totalTweetCount}` : ""} tweet${streamingTweetCount !== 1 ? "s" : ""}…`}
            </span>
          </div>
          {typeof totalTweetCount === "number" && totalTweetCount > 0 && (
            // P4-A: role="progressbar" with aria-value* for screen reader progress
            <div
              role="progressbar"
              aria-valuenow={streamingTweetCount}
              aria-valuemin={0}
              aria-valuemax={totalTweetCount}
              aria-label={`Thread generation progress: ${streamingTweetCount} of ${totalTweetCount} tweets`}
              className="h-1.5 bg-muted rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.min((streamingTweetCount! / totalTweetCount) * 100, 100)}%` }}
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
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
          <Label>Topic</Label>
          <Input
            placeholder="e.g. Productivity tips for developers"
            value={aiTopic}
            onChange={(e) => onTopicChange(e.target.value)}
          />
        </div>
      )}

      {aiTool === "rewrite" && (
        <div className="space-y-2">
          <Label>Tweet</Label>
          <Textarea
            value={aiRewriteText}
            onChange={(e) => onRewriteTextChange(e.target.value)}
            className="min-h-[120px]"
            placeholder="Enter or paste the tweet text you want to rewrite..."
          />
          {!aiRewriteText.trim() && (
            <p className="text-xs text-muted-foreground italic">Enter text above to enable rewrite</p>
          )}
        </div>
      )}

      {aiTool === "hashtags" && (
        <div className="space-y-2">
          <Label>Tweet content</Label>
          <div className="rounded-md border bg-muted/30 px-3 py-2.5 text-sm min-h-[60px]">
            {tweets.find((t) => t.id === aiTargetTweetId)?.content || (
              <span className="text-xs italic text-muted-foreground">
                No content yet — type something in the tweet editor first
              </span>
            )}
          </div>
        </div>
      )}

      {aiTool === "translate" && (
        <div className="space-y-2">
          <Label>Translate to</Label>
          <Select value={aiTranslateTarget} onValueChange={onTranslateTargetChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Source language is auto-detected</p>
          {!tweets.some((t) => t.content.trim()) && (
            <p className="text-xs text-muted-foreground italic">
              Add content to your tweet(s) to enable translation
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tone</Label>
          <Select value={aiTone} onValueChange={onToneChange}>
            <SelectTrigger>
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
            <Label>Language</Label>
            <Select value={aiLanguage} onValueChange={onLanguageChange}>
              <SelectTrigger>
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

      {aiTool === "thread" && tweets.length === 1 && (
        <AiLengthSelector
          selectedLength={aiLengthOption}
          onLengthChange={onLengthOptionChange}
          xSubscriptionTier={selectedTier}
        />
      )}

      {aiTool === "thread" && tweets.length > 1 && (
        <>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Length (Tweets)</Label>
              <span className="text-sm text-muted-foreground">{aiCount[0]}</span>
            </div>
            <Slider value={aiCount} onValueChange={onCountChange} min={3} max={15} step={1} />
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="ai-numbering-panel" className="text-sm cursor-pointer">Add numbering (1/N)</Label>
            <Switch id="ai-numbering-panel" checked={aiAddNumbering} onCheckedChange={onAddNumberingChange} />
          </div>
        </>
      )}

      {!hideActions && (
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isGenerating}>Cancel</Button>
          <Button size="sm" onClick={onGenerate} disabled={isGenerateDisabled}>
            {isGenerating && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Generate
          </Button>
        </div>
      )}
      </>
      )}
    </div>
  );
}
