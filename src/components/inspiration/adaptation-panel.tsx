"use client";

import { useState, useCallback, useEffect } from "react";
import { Loader2, Sparkles, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
  { value: "counter_point", label: "Counter Point", description: "Create a respectful counter-argument" },
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
  const [activeTab, setActiveTab] = useState<"manual" | "ai">("manual");
  const [aiAction, setAiAction] = useState("rephrase");
  const [aiTone, setAiTone] = useState("professional");
  const [aiLanguage, setAiLanguage] = useState<"ar" | "en">("ar");
  const [userContext, setUserContext] = useState("");
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <CardHeader>
        <CardTitle className="text-lg">Adapt Content</CardTitle>
        <CardDescription>Use AI or manually adapt the tweet to your style</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "manual" | "ai")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="h-4 w-4 mr-1" />
              AI Assist
            </TabsTrigger>
          </TabsList>

          {/* Manual Tab */}
          <TabsContent value="manual" className="space-y-4">
            <ManualEditor
              initialText={sourceTweet.text}
              sourceText={sourceTweet.text}
              onSendToComposer={(text) => onSendToComposer?.([text])}
            />
          </TabsContent>

          {/* AI Tab */}
          <TabsContent value="ai" className="space-y-4">
            {/* Action Selector */}
            <div className="space-y-2">
              <Label>What would you like to do?</Label>
              <Select value={aiAction} onValueChange={setAiAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_ACTIONS.map((action) => (
                    <SelectItem key={action.value} value={action.value}>
                      <div className="flex flex-col">
                        <span>{action.label}</span>
                        <span className="text-xs text-muted-foreground">{action.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAction && (
                <p className="text-xs text-muted-foreground">{selectedAction.description}</p>
              )}
            </div>

            {/* Tone Selector */}
            <div className="space-y-2">
              <Label>Tone (optional)</Label>
              <Select value={aiTone} onValueChange={setAiTone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
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
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={aiLanguage} onValueChange={(v) => setAiLanguage(v as "ar" | "en")}>
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label>Your perspective (optional)</Label>
              <Textarea
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                placeholder="Add your unique angle, expertise, or opinion..."
                className="min-h-[80px] resize-none"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">{userContext.length} / 1000</p>
            </div>

            {/* Generate Button */}
            {!generatedContent ? (
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-4">
                {/* Generated Content Display */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Generated Content ({aiAction})
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
                    <div
                      key={i}
                      className="p-3 bg-muted/30 rounded-md border border-border"
                    >
                      <div className="text-xs text-muted-foreground mb-1">
                        {generatedContent.tweets.length > 1 ? `Tweet ${i + 1}` : "Tweet"}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{tweet}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {tweet.length} / 280 characters
                      </p>
                    </div>
                  ))}

                  {/* Send to Composer Button */}
                  <Button
                    onClick={handleSendAiToComposer}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send to Composer
                  </Button>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/50 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
