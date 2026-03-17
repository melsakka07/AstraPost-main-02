"use client";

import { useState } from "react";
import {
  Bot,
  Globe,
  Hash,
  Link2,
  PenTool,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Shuffle,
} from "lucide-react";
import { toast } from "sonner";
import { HashtagGenerator } from "@/components/ai/hashtag-generator";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

interface Variant {
  text: string;
  angle: string;
  rationale: string;
}

const ANGLE_COLORS: Record<string, string> = {
  emotional: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  factual: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  question: "bg-green-500/10 text-green-600 border-green-500/20",
  story: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  list: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

export default function AIWriterPage() {
  const { openWithContext } = useUpgradeModal();
  const [activeTab, setActiveTab] = useState<"thread" | "hashtags" | "url" | "variants">("thread");

  // --- Thread Writer State ---
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("casual");
  const [language, setLanguage] = useState("en");
  const [tweetCount, setTweetCount] = useState(5);
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // --- URL → Thread State ---
  const [articleUrl, setArticleUrl] = useState("");
  const [urlTone, setUrlTone] = useState("educational");
  const [urlLanguage, setUrlLanguage] = useState("en");
  const [urlTweetCount, setUrlTweetCount] = useState(5);
  const [urlResult, setUrlResult] = useState<{ tweets: string[]; title: string } | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  // --- A/B Variants State ---
  const [variantTweet, setVariantTweet] = useState("");
  const [variantLanguage, setVariantLanguage] = useState("en");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantLoading, setVariantLoading] = useState(false);
  const [variantCopied, setVariantCopied] = useState<number | null>(null);

  // ── Thread Writer ──────────────────────────────────────────────────────────

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
          try { payload = await res.json() as PlanLimitPayload; } catch {}
          openWithContext({
            error: payload?.error, code: payload?.code, message: payload?.message,
            feature: payload?.feature, plan: payload?.plan, limit: payload?.limit,
            used: payload?.used, remaining: payload?.remaining,
            upgradeUrl: payload?.upgrade_url, suggestedPlan: payload?.suggested_plan,
            trialActive: payload?.trial_active, resetAt: payload?.reset_at,
          });
          return;
        }
        throw new Error("Failed to generate");
      }
      const data = await res.json() as { tweets: string[] };
      setGeneratedContent(Array.isArray(data.tweets) ? data.tweets.join("\n\n---\n\n") : JSON.stringify(data));
    } catch {
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

  // ── URL → Thread ───────────────────────────────────────────────────────────

  const handleUrlGenerate = async () => {
    if (!articleUrl.trim()) return;
    setUrlLoading(true);
    setUrlResult(null);
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: articleUrl, language: urlLanguage, tweetCount: urlTweetCount, tone: urlTone }),
      });
      if (!res.ok) {
        if (res.status === 402) {
          let payload: PlanLimitPayload | null = null;
          try { payload = await res.json() as PlanLimitPayload; } catch {}
          openWithContext({
            error: payload?.error, code: payload?.code, message: payload?.message,
            feature: payload?.feature, plan: payload?.plan, limit: payload?.limit,
            used: payload?.used, remaining: payload?.remaining,
            upgradeUrl: payload?.upgrade_url, suggestedPlan: payload?.suggested_plan,
            trialActive: payload?.trial_active, resetAt: payload?.reset_at,
          });
          return;
        }
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Failed to convert URL");
        return;
      }
      const data = await res.json() as { tweets: string[]; title: string };
      setUrlResult(data);
    } catch {
      toast.error("Failed to convert URL to thread");
    } finally {
      setUrlLoading(false);
    }
  };

  const copyUrlThread = () => {
    if (!urlResult) return;
    navigator.clipboard.writeText(urlResult.tweets.join("\n\n---\n\n"));
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

  // ── A/B Variants ───────────────────────────────────────────────────────────

  const handleVariants = async () => {
    if (!variantTweet.trim()) return;
    setVariantLoading(true);
    setVariants([]);
    try {
      const res = await fetch("/api/ai/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweet: variantTweet, language: variantLanguage }),
      });
      if (!res.ok) {
        if (res.status === 402) {
          let payload: PlanLimitPayload | null = null;
          try { payload = await res.json() as PlanLimitPayload; } catch {}
          openWithContext({
            error: payload?.error, code: payload?.code, message: payload?.message,
            feature: payload?.feature, plan: payload?.plan, limit: payload?.limit,
            used: payload?.used, remaining: payload?.remaining,
            upgradeUrl: payload?.upgrade_url, suggestedPlan: payload?.suggested_plan,
            trialActive: payload?.trial_active, resetAt: payload?.reset_at,
          });
          return;
        }
        throw new Error("Failed to generate variants");
      }
      const data = await res.json() as { variants: Variant[] };
      setVariants(data.variants);
    } catch {
      toast.error("Failed to generate variants");
    } finally {
      setVariantLoading(false);
    }
  };

  const copyVariant = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setVariantCopied(idx);
    setTimeout(() => setVariantCopied(null), 2000);
    toast.success("Copied to clipboard");
  };

  const applyVariant = (text: string) => {
    setVariantTweet(text);
    toast.success("Loaded into editor");
  };

  return (
    <DashboardPageWrapper
      icon={Bot}
      title="AI Writer"
      description="Generate viral content with AI assistance."
    >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-6">
        <TabsList className="grid w-full max-w-xl grid-cols-4">
          <TabsTrigger value="thread">
            <PenTool className="h-3.5 w-3.5 mr-1.5" />
            Thread
          </TabsTrigger>
          <TabsTrigger value="url">
            <Link2 className="h-3.5 w-3.5 mr-1.5" />
            URL
          </TabsTrigger>
          <TabsTrigger value="variants">
            <Shuffle className="h-3.5 w-3.5 mr-1.5" />
            Variants
          </TabsTrigger>
          <TabsTrigger value="hashtags">
            <Hash className="h-3.5 w-3.5 mr-1.5" />
            Hashtags
          </TabsTrigger>
        </TabsList>

        {/* ── Thread Writer Tab ── */}
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tone</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <Label><Globe className="inline h-3.5 w-3.5 mr-1" />Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Slider value={[tweetCount]} onValueChange={(v) => setTweetCount(v[0] ?? 5)} min={3} max={15} step={1} />
                  <div className="flex justify-between text-xs text-muted-foreground"><span>Short (3)</span><span>Long (15)</span></div>
                </div>
                <Button className="w-full" onClick={handleGenerate} disabled={isGenerating || !topic} size="lg">
                  {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate Thread</>}
                </Button>
              </CardContent>
            </Card>

            <Card className="h-full flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Generated Result</CardTitle>
                {generatedContent && (
                  <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                    {copied ? <><Check className="h-4 w-4 mr-2" />Copied!</> : <><Copy className="h-4 w-4 mr-2" />Copy</>}
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

        {/* ── URL → Thread Tab ── */}
        <TabsContent value="url" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-primary" />
                  Article / URL to Thread
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="articleUrl">Article or Blog URL</Label>
                  <Input
                    id="articleUrl"
                    placeholder="https://example.com/article..."
                    value={articleUrl}
                    onChange={(e) => setArticleUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Paste any publicly accessible article, blog post, or news URL.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tone</Label>
                    <Select value={urlTone} onValueChange={setUrlTone}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="educational">Educational</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="inspirational">Inspirational</SelectItem>
                        <SelectItem value="viral">Viral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Output Language</Label>
                    <Select value={urlLanguage} onValueChange={setUrlLanguage}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">Arabic</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="tr">Turkish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Thread Length</Label>
                    <span className="text-sm font-medium tabular-nums text-muted-foreground">{urlTweetCount} tweets</span>
                  </div>
                  <Slider value={[urlTweetCount]} onValueChange={(v) => setUrlTweetCount(v[0] ?? 5)} min={3} max={12} step={1} />
                </div>
                <Button className="w-full" onClick={handleUrlGenerate} disabled={urlLoading || !articleUrl.trim()} size="lg">
                  {urlLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Converting...</> : <><Sparkles className="mr-2 h-4 w-4" />Convert to Thread</>}
                </Button>
              </CardContent>
            </Card>

            <Card className="h-full flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Generated Thread</CardTitle>
                  {urlResult?.title && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{urlResult.title}</p>
                  )}
                </div>
                {urlResult && (
                  <Button variant="ghost" size="sm" onClick={copyUrlThread}>
                    {urlCopied ? <><Check className="h-4 w-4 mr-2" />Copied!</> : <><Copy className="h-4 w-4 mr-2" />Copy</>}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                {urlResult ? (
                  <div className="h-full whitespace-pre-wrap break-words rounded-md bg-muted p-4 text-sm leading-relaxed border">
                    {urlResult.tweets.join("\n\n---\n\n")}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center rounded-lg bg-gradient-to-b from-muted/50 to-muted/20 p-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <Link2 className="h-7 w-7 text-primary" />
                    </div>
                    <p className="font-medium">Paste a URL to convert</p>
                    <p className="mt-1 text-sm text-muted-foreground max-w-[240px]">The article content will be extracted and converted into a Twitter thread.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── A/B Variants Tab ── */}
        <TabsContent value="variants" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shuffle className="h-5 w-5 text-primary" />
                  A/B Variant Generator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="variantTweet">Original Tweet</Label>
                  <Textarea
                    id="variantTweet"
                    placeholder="Paste your tweet here..."
                    className="min-h-[120px] resize-none"
                    value={variantTweet}
                    onChange={(e) => setVariantTweet(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">{variantTweet.length} chars</p>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={variantLanguage} onValueChange={setVariantLanguage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">Arabic</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="tr">Turkish</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleVariants} disabled={variantLoading || !variantTweet.trim()} size="lg">
                  {variantLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><Shuffle className="mr-2 h-4 w-4" />Generate 3 Variants</>}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {variants.length === 0 && !variantLoading ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center h-full">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Shuffle className="h-7 w-7 text-primary" />
                  </div>
                  <p className="font-medium">3 variants will appear here</p>
                  <p className="mt-1 text-sm text-muted-foreground max-w-xs">Each variant uses a different angle: emotional, factual, and question.</p>
                </div>
              ) : variantLoading ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-12 gap-3 h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Generating variants...</p>
                </div>
              ) : (
                variants.map((v, idx) => (
                  <Card key={idx} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${ANGLE_COLORS[v.angle] ?? ""}`}
                        >
                          {v.angle}
                        </span>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => copyVariant(v.text, idx)}>
                            {variantCopied === idx ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => applyVariant(v.text)}>
                            Use
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed">{v.text}</p>
                      <p className="text-xs text-muted-foreground italic">{v.rationale}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Hashtag Generator Tab ── */}
        <TabsContent value="hashtags">
          <HashtagGenerator />
        </TabsContent>
      </Tabs>
    </DashboardPageWrapper>
  );
}
