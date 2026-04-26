"use client";

import { useState, useCallback, useEffect } from "react";
import { Loader2, Sparkles, RefreshCw, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/auth-client";
import type { Tweet } from "@/lib/services/tweet-importer";
import { ManualEditor } from "./manual-editor";

interface AdaptationPanelProps {
  sourceTweet: Tweet;
  threadContext?: string[];
  onSendToComposer?: (tweets: string[]) => void;
}

const AI_ACTIONS = [
  { value: "rephrase", label: "Rephrase", description: "Rewrite in different words" },
  { value: "change_tone", label: "Change Tone", description: "Adapt to a different tone" },
  { value: "expand_thread", label: "Expand Thread", description: "Turn into a multi-tweet thread" },
  { value: "add_take", label: "Add Your Take", description: "Inject your personal perspective" },
  { value: "translate", label: "Translate", description: "Translate to another language" },
  {
    value: "counter_point",
    label: "Counter Point",
    description: "Create a respectful counter-argument",
  },
];

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "humorous", label: "Humorous" },
  { value: "educational", label: "Educational" },
  { value: "inspirational", label: "Inspirational" },
  { value: "viral", label: "Viral" },
];

const LANGUAGES = [
  { value: "ar", label: "Arabic" },
  { value: "en", label: "English" },
];

interface GeneratedContent {
  tweets: string[];
  action: string;
}

export function AdaptationPanel({
  sourceTweet,
  threadContext = [],
  onSendToComposer,
}: AdaptationPanelProps) {
  const { data: session } = useSession();
  const t = useTranslations("inspiration");
  const [activeTab, setActiveTab] = useState<"manual" | "ai">("manual");
  const [aiAction, setAiAction] = useState("rephrase");
  const [aiTone, setAiTone] = useState("professional");
  const [aiLanguage, setAiLanguage] = useState<"ar" | "en">("ar");
  const [userContext, setUserContext] = useState("");
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync AI language with user's preferred language once session loads
  useEffect(() => {
    if (session?.user && "language" in session.user) {
      setAiLanguage((session.user as any).language || "ar");
    }
  }, [session?.user]);

  // Reset generated content when source tweet changes
  useEffect(() => {
    setGeneratedContent(null);
    setError(null);
  }, [sourceTweet.id]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/inspire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalTweet: sourceTweet.text,
          threadContext: threadContext.length > 0 ? threadContext : undefined,
          action: aiAction,
          tone: aiTone || undefined,
          language: aiLanguage,
          userContext: userContext || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate content");
      }

      const data = await response.json();
      setGeneratedContent({ tweets: data.tweets, action: data.action });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate content");
    } finally {
      setIsGenerating(false);
    }
  }, [sourceTweet.text, threadContext, aiAction, aiTone, aiLanguage, userContext]);

  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const handleSendAiToComposer = useCallback(() => {
    if (generatedContent && onSendToComposer) {
      onSendToComposer(generatedContent.tweets);
    }
  }, [generatedContent, onSendToComposer]);

  const selectedAction = AI_ACTIONS.find((a) => a.value === aiAction);

  return (
    <Card>
      <CardContent className="px-3 pt-4 sm:px-6 sm:pt-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "manual" | "ai")}>
          <TabsList className="grid h-9 w-full grid-cols-2 sm:h-10">
            <TabsTrigger value="manual" className="text-xs sm:text-sm">
              {t("manual.title")}
            </TabsTrigger>
            <TabsTrigger value="ai" className="text-xs sm:text-sm">
              <Sparkles className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t("ai_assist.title")}
            </TabsTrigger>
          </TabsList>

          {/* Manual Tab */}
          <TabsContent value="manual" className="mt-4 space-y-4">
            <ManualEditor
              initialText={sourceTweet.text}
              sourceText={sourceTweet.text}
              onSendToComposer={(text) => onSendToComposer?.([text])}
            />
          </TabsContent>

          {/* AI Tab */}
          <TabsContent value="ai" className="mt-4 space-y-3 sm:space-y-4">
            {/* Action Selector */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">{t("ai_assist.what_do")}</Label>
              <Select value={aiAction} onValueChange={setAiAction}>
                <SelectTrigger className="h-9 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_ACTIONS.map((action) => (
                    <SelectItem key={action.value} value={action.value}>
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm">
                          {t(`ai_assist.${action.value}` as any)}
                        </span>
                        <span className="text-muted-foreground text-[10px] sm:text-xs">
                          {t(`ai_assist.${action.value}_description` as any)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAction && (
                <p className="text-muted-foreground text-[10px] sm:text-xs">
                  {t(`ai_assist.${selectedAction.value}_description` as any)}
                </p>
              )}
            </div>

            {/* Tone Selector */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">{t("ai_assist.tone_optional")}</Label>
              <Select value={aiTone} onValueChange={setAiTone}>
                <SelectTrigger className="h-9 sm:h-10">
                  <SelectValue placeholder={t("ai_assist.select_tone")} />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((tone) => (
                    <SelectItem key={tone.value} value={tone.value}>
                      {tone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Language Toggle */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">{t("ai_assist.language")}</Label>
              <Select value={aiLanguage} onValueChange={(v) => setAiLanguage(v as "ar" | "en")}>
                <SelectTrigger className="h-9 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Context (optional) */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">{t("ai_assist.your_perspective")}</Label>
              <Textarea
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                placeholder={t("ai_assist.perspective_placeholder")}
                className="min-h-[60px] resize-none text-sm sm:min-h-[80px]"
                maxLength={1000}
              />
              <p className="text-muted-foreground text-[10px] sm:text-xs">
                {t("ai_assist.perspective_count", { count: userContext.length })}
              </p>
            </div>

            {/* Generate Button */}
            {!generatedContent ? (
              <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("ai_assist.generating")}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t("ai_assist.generate")}
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-4">
                {/* Generated Content Display */}
                <div className="border-border space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm font-medium">
                      {t("ai_assist.generated_content", { action: aiAction })}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRegenerate}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {generatedContent.tweets.map((tweet, i) => (
                    <div key={i} className="bg-muted/30 border-border rounded-md border p-3">
                      <div className="text-muted-foreground mb-1 text-xs">
                        {generatedContent.tweets.length > 1
                          ? t("ai_assist.tweet_number", { number: i + 1 })
                          : t("ai_assist.tweet_label")}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{tweet}</p>
                      <p className="text-muted-foreground mt-2 text-xs">
                        {t("ai_assist.chars", { count: tweet.length })}
                      </p>
                    </div>
                  ))}

                  {/* Send to Composer Button */}
                  <Button onClick={handleSendAiToComposer} className="w-full">
                    <Send className="mr-2 h-4 w-4" />
                    {t("ai_assist.send_to_composer")}
                  </Button>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-destructive/10 border-destructive/50 rounded-lg border p-3">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
