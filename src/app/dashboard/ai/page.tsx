"use client";

import { useState } from "react";
import { Bot, Globe, Hash, PenTool, Sparkles, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { HashtagGenerator } from "@/components/ai/hashtag-generator";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";

interface PlanLimitPayload {
  error?: string;
  code?: string;
  message?: string;
  feature?: string;
  plan?: string;
  limit?: number | null;
  used?: number;
  remaining?: number | null;
  upgrade_url?: string;
  suggested_plan?: string;
  trial_active?: boolean;
  reset_at?: string | null;
}

export default function AIWriterPage() {
  const { openWithContext } = useUpgradeModal();
  const [activeTab, setActiveTab] = useState<"thread" | "hashtags">("thread");

  // Thread Writer State
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("casual");
  const [language, setLanguage] = useState("en");
  const [tweetCount, setTweetCount] = useState(5);
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!topic) return;
    setIsGenerating(true);
    setGeneratedContent("");

    try {
      const res = await fetch("/api/ai/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, tone, language, tweetCount }),
      });

      if (!res.ok) {
        if (res.status === 402) {
          let payload: PlanLimitPayload | null = null;
          try {
            payload = (await res.json()) as PlanLimitPayload;
          } catch {}
          openWithContext({
            error: payload?.error,
            code: payload?.code,
            message: payload?.message,
            feature: payload?.feature,
            plan: payload?.plan,
            limit: payload?.limit,
            used: payload?.used,
            remaining: payload?.remaining,
            upgradeUrl: payload?.upgrade_url,
            suggestedPlan: payload?.suggested_plan,
            trialActive: payload?.trial_active,
            resetAt: payload?.reset_at,
          });
          return;
        }
        throw new Error("Failed to generate");
      }

      const data = await res.json();
      const text = Array.isArray(data.tweets)
        ? data.tweets.join("\n\n---\n\n")
        : JSON.stringify(data);

      setGeneratedContent(text);
    } catch (error) {
      toast.error("Failed to generate content");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

  return (
    <DashboardPageWrapper
      icon={Bot}
      title="AI Writer"
      description="Generate viral content with AI assistance."
    >
      {/* Tool Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="thread">
            <PenTool className="h-4 w-4 mr-2" />
            Thread Writer
          </TabsTrigger>
          <TabsTrigger value="hashtags">
            <Hash className="h-4 w-4 mr-2" />
            Hashtag Generator
          </TabsTrigger>
        </TabsList>

        {/* Thread Writer Tab */}
        <TabsContent value="thread" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenTool className="h-5 w-5 text-primary" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic or Idea</Label>
                  <Textarea
                    id="topic"
                    placeholder="e.g. The future of remote work..."
                    className="min-h-[120px] resize-none"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter a topic or idea you want to create a thread about.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tone">Tone</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger id="tone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="humorous">Humorous</SelectItem>
                        <SelectItem value="controversial">Controversial</SelectItem>
                        <SelectItem value="educational">Educational</SelectItem>
                        <SelectItem value="inspirational">Inspirational</SelectItem>
                        <SelectItem value="viral">Viral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">
                      <Globe className="inline h-3.5 w-3.5 mr-1" />
                      Language
                    </Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger id="language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">Arabic</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="it">Italian</SelectItem>
                        <SelectItem value="pt">Portuguese</SelectItem>
                        <SelectItem value="tr">Turkish</SelectItem>
                        <SelectItem value="ru">Russian</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Thread Length</Label>
                    <span className="text-sm font-medium tabular-nums text-muted-foreground">{tweetCount} tweets</span>
                  </div>
                  <Slider
                    value={[tweetCount]}
                    onValueChange={(values) => setTweetCount(values[0] ?? 5)}
                    min={3}
                    max={15}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Short (3)</span>
                    <span>Long (15)</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleGenerate}
                  disabled={isGenerating || !topic}
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Thread
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="h-full flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Generated Result</CardTitle>
                {generatedContent && (
                  <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                {generatedContent ? (
                  <div className="h-full whitespace-pre-wrap break-words rounded-md bg-muted p-4 text-sm leading-relaxed border">
                    {generatedContent}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center rounded-lg bg-gradient-to-b from-muted/50 to-muted/20 p-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <PenTool className="h-7 w-7 text-primary" />
                    </div>
                    <p className="font-medium text-foreground">Ready to generate</p>
                    <p className="mt-1 text-sm text-muted-foreground max-w-[240px]">Enter a topic, set your preferences, then click Generate Thread</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Hashtag Generator Tab */}
        <TabsContent value="hashtags">
          <HashtagGenerator />
        </TabsContent>
      </Tabs>
    </DashboardPageWrapper>
  );
}
