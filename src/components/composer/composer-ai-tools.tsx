"use client";

import { lazy, Suspense } from "react";
import dynamic from "next/dynamic";
import { Loader2, Sparkles, X as XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TweetDraft } from "@/components/composer/composer-types";
import type { useComposerAi } from "@/components/composer/use-composer-ai";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { type XSubscriptionTier } from "@/components/ui/x-subscription-badge";

const AiToolsPanel = dynamic(() =>
  import("@/components/composer/ai-tools-panel").then((m) => m.AiToolsPanel)
);
// P4-E: Lazy-load TemplatesDialog — it's 834 lines and only needed on user interaction
const TemplatesDialog = lazy(() =>
  import("@/components/composer/templates-dialog").then((m) => ({ default: m.TemplatesDialog }))
);

type AiState = ReturnType<typeof useComposerAi>;

interface ComposerAiToolsProps extends Pick<
  AiState,
  | "isAiOpen"
  | "setIsAiOpen"
  | "aiTool"
  | "setAiTool"
  | "openAiTool"
  | "aiTopic"
  | "setAiTopic"
  | "aiTone"
  | "setAiTone"
  | "aiLanguage"
  | "setAiLanguage"
  | "aiCount"
  | "setAiCount"
  | "aiAddNumbering"
  | "setAiAddNumbering"
  | "aiLengthOption"
  | "setAiLengthOption"
  | "aiRewriteText"
  | "setAiRewriteText"
  | "aiTranslateTarget"
  | "setAiTranslateTarget"
  | "aiTargetTweetId"
  | "setAiTargetTweetId"
  | "isGenerating"
  | "streamingTweetCount"
  | "generatedHashtags"
  | "setGeneratedHashtags"
  | "inspirationTopics"
  | "inspirationNiche"
  | "setInspirationNiche"
  | "isLoadingInspiration"
  | "templateConfig"
  | "setTemplateConfig"
  | "templateFormat"
  | "setTemplateFormat"
  | "templatesDialogOpen"
  | "setTemplatesDialogOpen"
  | "handleAiRun"
  | "handleFetchInspiration"
  | "handleInspirationSelect"
  | "handleTemplateSelect"
  | "handleTemplateConfigSelect"
> {
  isDesktop: boolean;
  selectedTier: XSubscriptionTier | null;
  tweets: TweetDraft[];
  activeTweetId: string | null;
  updateTweet: (id: string, content: string) => void;
  isAiGenerateDisabled: boolean;
}

export function ComposerAiTools(props: ComposerAiToolsProps) {
  const {
    isAiOpen,
    setIsAiOpen,
    aiTool,
    setAiTool,
    openAiTool,
    aiTopic,
    setAiTopic,
    aiTone,
    setAiTone,
    aiLanguage,
    setAiLanguage,
    aiCount,
    setAiCount,
    aiAddNumbering,
    setAiAddNumbering,
    aiLengthOption,
    setAiLengthOption,
    aiRewriteText,
    setAiRewriteText,
    aiTranslateTarget,
    setAiTranslateTarget,
    aiTargetTweetId,
    setAiTargetTweetId,
    isGenerating,
    streamingTweetCount,
    generatedHashtags,
    setGeneratedHashtags,
    inspirationTopics,
    inspirationNiche,
    setInspirationNiche,
    isLoadingInspiration,
    templateConfig,
    setTemplateConfig,
    templateFormat,
    setTemplateFormat,
    templatesDialogOpen,
    setTemplatesDialogOpen,
    handleAiRun,
    handleFetchInspiration,
    handleInspirationSelect,
    handleTemplateSelect,
    handleTemplateConfigSelect,
    isDesktop,
    selectedTier,
    tweets,
    activeTweetId,
    updateTweet,
    isAiGenerateDisabled,
  } = props;
  const t = useTranslations("compose");

  const panel = (
    <AiToolsPanel
      aiTool={aiTool}
      onToolChange={(tool) => {
        setAiTool(tool);
        setGeneratedHashtags([]);
        if (tool === "hashtags" || tool === "hook" || tool === "rewrite") {
          setAiTargetTweetId(activeTweetId ?? tweets[0]?.id ?? null);
        }
        if (tool === "thread") {
          setAiTopic((tweets[0]?.content?.trim() || "").slice(0, 500));
        }
      }}
      aiTopic={aiTopic}
      onTopicChange={setAiTopic}
      aiTone={aiTone}
      onToneChange={setAiTone}
      aiLanguage={aiLanguage}
      onLanguageChange={setAiLanguage}
      aiCount={aiCount}
      onCountChange={setAiCount}
      aiAddNumbering={aiAddNumbering}
      onAddNumberingChange={setAiAddNumbering}
      onBrowseTemplates={() => setTemplatesDialogOpen(true)}
      aiLengthOption={aiLengthOption}
      onLengthOptionChange={setAiLengthOption}
      selectedTier={selectedTier ?? null}
      tweets={tweets}
      aiRewriteText={aiRewriteText}
      onRewriteTextChange={setAiRewriteText}
      aiTranslateTarget={aiTranslateTarget}
      onTranslateTargetChange={setAiTranslateTarget}
      aiTargetTweetId={aiTargetTweetId}
      isGenerating={isGenerating}
      streamingTweetCount={streamingTweetCount}
      {...(typeof aiCount[0] === "number" && { totalTweetCount: aiCount[0] })}
      onGenerate={handleAiRun}
      onClose={() => setIsAiOpen(false)}
      {...(!isDesktop && { hideActions: true })}
      // Phase 1: Inspiration props
      inspirationTopics={inspirationTopics}
      inspirationNiche={inspirationNiche}
      isLoadingInspiration={isLoadingInspiration}
      onInspirationNicheChange={setInspirationNiche}
      onFetchInspiration={handleFetchInspiration}
      onInspirationSelect={handleInspirationSelect}
      // Phase 2: Template props
      templateConfig={templateConfig}
      templateFormat={templateFormat}
      onTemplateFormatChange={setTemplateFormat}
      onClearTemplate={() => setTemplateConfig(null)}
      // Phase 3: Hashtag chips props
      generatedHashtags={generatedHashtags}
      onHashtagClick={(tag) => {
        const targetId = aiTargetTweetId ?? activeTweetId ?? tweets[0]?.id;
        if (targetId) {
          const tweet = tweets.find((tw) => tw.id === targetId);
          if (tweet) {
            updateTweet(targetId, `${tweet.content} ${tag}`.trim());
            setGeneratedHashtags((prev) => prev.filter((existing) => existing !== tag));
          }
        }
      }}
      onHashtagsDone={() => setGeneratedHashtags([])}
      isAiOpen={isAiOpen}
    />
  );

  return (
    <>
      <Card>
        <CardContent className="space-y-2 px-3 pt-3 sm:space-y-3 sm:px-6 sm:pt-5">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground/70 text-xs font-medium">{t("label.ai_tools")}</p>
            {isAiOpen && (
              <p className="text-muted-foreground/50 text-[10px] sm:text-xs">
                {aiTool === "thread" && "Writer"}
                {aiTool === "inspire" && "Inspire"}
                {aiTool === "template" && "Template"}
                {aiTool === "hook" && "Hook"}
                {aiTool === "cta" && "CTA"}
                {aiTool === "rewrite" && "Rewrite"}
                {aiTool === "translate" && "Translate"}
                {aiTool === "hashtags" && "#Tags"}
              </p>
            )}
          </div>
          <Suspense
            fallback={
              <Button
                variant="outline"
                size="sm"
                className="h-10 w-full justify-center gap-2 text-sm sm:h-11"
                disabled
              >
                <Sparkles className="text-primary h-4 w-4 shrink-0" />
                <span>{t("label.ai_tools")}</span>
              </Button>
            }
          >
            <TemplatesDialog
              open={templatesDialogOpen}
              onOpenChange={setTemplatesDialogOpen}
              onSelect={(selected, aiMeta) => handleTemplateSelect(selected, aiMeta)}
              onTemplateSelect={handleTemplateConfigSelect}
            />
          </Suspense>
          <Button
            variant="outline"
            size="sm"
            className="h-10 w-full justify-center gap-2 text-sm sm:h-11 sm:text-sm"
            onClick={() => {
              if (isAiOpen) {
                setIsAiOpen(false);
              } else {
                openAiTool(aiTool || "thread");
              }
            }}
          >
            <Sparkles className="text-primary h-4 w-4 shrink-0 sm:h-4.5 sm:w-4.5" />
            {isAiOpen ? (
              <>
                <span>{t("label.close")}</span>
                <XIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </>
            ) : (
              <span>{t("label.ai_tools")}</span>
            )}
          </Button>
          {/* P1-B/C: Inline AI panel expands here on desktop when open */}
          {isAiOpen && isDesktop && <div className="border-t pt-2">{panel}</div>}
        </CardContent>
      </Card>

      {/* Mobile AI panel — Sheet (P1-B: desktop uses inline accordion above) */}
      {!isDesktop && (
        <Sheet open={isAiOpen} onOpenChange={setIsAiOpen}>
          <SheetContent
            side="bottom"
            className="pb-safe mx-2 flex h-[80dvh] flex-col gap-0 overflow-hidden rounded-t-2xl px-0 sm:mx-0 sm:h-[60dvh]"
          >
            <SheetHeader className="shrink-0 px-4 pb-2 sm:px-6">
              <SheetTitle>{t("ai_tools.title")}</SheetTitle>
              <SheetDescription>{t("ai_tools.sheet_description")}</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 py-2 sm:px-6">{panel}</div>
            <div className="mt-2 flex shrink-0 justify-end gap-2 border-t px-4 pt-3 pb-4 sm:px-6 sm:pt-4 sm:pb-6">
              <Button
                variant="outline"
                size="sm"
                className="h-10 sm:h-9"
                onClick={() => setIsAiOpen(false)}
              >
                {t("label.cancel")}
              </Button>
              <Button
                size="sm"
                className="h-10 sm:h-9"
                onClick={() => handleAiRun()}
                disabled={isAiGenerateDisabled}
              >
                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("ai_tools.generate")}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
