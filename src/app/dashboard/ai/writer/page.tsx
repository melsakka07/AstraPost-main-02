"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bot,
  Globe,
  Hash,
  Link2,
  PenSquare,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { useElapsedTime } from "@/hooks/use-elapsed-time";
import { sendToComposer } from "@/lib/composer-bridge";

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

type ActiveTab = "thread" | "url" | "variants" | "hashtags";

function AIWriterContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams?.get("tab") as ActiveTab | null) ?? "thread";
  const { openWithContext } = useUpgradeModal();
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);

  // --- Thread Writer State ---
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("casual");
  const [language, setLanguage] = useState("en");
  const [tweetCount, setTweetCount] = useState(5);
  const [generatedTweets, setGeneratedTweets] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedTweetIdx, setCopiedTweetIdx] = useState<number | null>(null);
  const threadElapsed = useElapsedTime(isGenerating);

  // --- URL → Thread State ---
  const [articleUrl, setArticleUrl] = useState("");
  const [urlTone, setUrlTone] = useState("educational");
  const [urlLanguage, setUrlLanguage] = useState("en");
  const [urlTweetCount, setUrlTweetCount] = useState(5);
  const [urlResult, setUrlResult] = useState<{ tweets: string[]; title: string } | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const urlElapsed = useElapsedTime(urlLoading);

  // --- A/B Variants State ---
  const [variantTweet, setVariantTweet] = useState("");
  const [variantLanguage, setVariantLanguage] = useState("en");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantLoading, setVariantLoading] = useState(false);
  const [variantCopied, setVariantCopied] = useState<number | null>(null);
  const variantElapsed = useElapsedTime(variantLoading);

  // ── Thread Writer ──────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!topic) return;
    setIsGenerating(true);
    setGeneratedTweets([]);
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

      if (!res.body) throw new Error("No response body");

      // Read the SSE stream and add tweets one by one as they arrive
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });

        // Split on newlines; keep the last (potentially incomplete) line in the buffer
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const jsonStr = trimmed.slice(6);
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr) as {
              done?: boolean;
              error?: string;
              index?: number;
              tweet?: string;
            };

            if (event.error) {
              toast.error("Generation failed. Please try again.");
              streamDone = true;
              break;
            }

            if (event.done) {
              streamDone = true;
              break;
            }

            if (typeof event.tweet === "string" && event.tweet.length > 0) {
              setGeneratedTweets((prev) => [...prev, event.tweet!]);
            }
          } catch {
            // Skip malformed SSE events
          }
        }
      }
    } catch {
      toast.error("Failed to generate content");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyAllTweets = () => {
    navigator.clipboard.writeText(generatedTweets.join("\n\n---\n\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    toast.success("Copied to clipboard");
  };

  const copyTweet = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedTweetIdx(idx);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedTweetIdx(null), 2000);
  };

  const updateGeneratedTweet = (idx: number, text: string) => {
    setGeneratedTweets((prev) => prev.map((t, i) => (i === idx ? text : t)));
  };

  const updateUrlTweet = (idx: number, text: string) => {
    setUrlResult((prev) => prev ? { ...prev, tweets: prev.tweets.map((t, i) => (i === idx ? text : t)) } : null);
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
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)} className="space-y-6">
      <TabsList className="grid w-full max-w-xl grid-cols-4">
        <TabsTrigger value="thread">
          <PenTool className="h-3.5 w-3.5 me-1.5" />
          <span className="hidden sm:inline">Thread Writer</span>
          <span className="sm:hidden">Thread</span>
        </TabsTrigger>
        <TabsTrigger value="url">
          <Link2 className="h-3.5 w-3.5 me-1.5" />
          <span className="hidden sm:inline">URL → Thread</span>
          <span className="sm:hidden">URL</span>
        </TabsTrigger>
        <TabsTrigger value="variants">
          <Shuffle className="h-3.5 w-3.5 me-1.5" />
          <span className="hidden sm:inline">A/B Variants</span>
          <span className="sm:hidden">Variants</span>
        </TabsTrigger>
        <TabsTrigger value="hashtags">
          <Hash className="h-3.5 w-3.5 me-1.5" />
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
                  <Label><Globe className="inline h-3.5 w-3.5 me-1" />Language</Label>
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
                <Slider value={[tweetCount]} onValueChange={(v) => setTweetCount(v[0] ?? 5)} min={3} max={15} step={1} aria-label="Thread length" />
                <div className="flex justify-between text-xs text-muted-foreground"><span>Short (3)</span><span>Long (15)</span></div>
              </div>
              <Button className="w-full" onClick={handleGenerate} disabled={isGenerating || !topic} size="lg">
                {isGenerating ? <><Loader2 className="me-2 h-4 w-4 animate-spin" />Generating... ({threadElapsed}s)</> : <><Sparkles className="me-2 h-4 w-4" />Generate Thread</>}
              </Button>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            {generatedTweets.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {isGenerating
                      ? `Generating ${generatedTweets.length} / ${tweetCount}…`
                      : `${generatedTweets.length} tweets`}
                  </span>
                  {!isGenerating && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={copyAllTweets} aria-label="Copy all tweets">
                        {copiedAll ? <><Check className="h-3.5 w-3.5 me-1.5" />Copied</> : <><Copy className="h-3.5 w-3.5 me-1.5" />Copy All</>}
                      </Button>
                      <Button size="sm" onClick={() => sendToComposer(generatedTweets, { source: "ai-writer", tone })}>
                        <PenSquare className="h-3.5 w-3.5 me-1.5" />Open in Composer
                      </Button>
                    </div>
                  )}
                </div>
                {generatedTweets.map((tweet, idx) => (
                  <Card key={idx} className="border focus-within:border-primary/40 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <Badge variant="secondary" className="shrink-0 tabular-nums">#{idx + 1}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 shrink-0"
                          onClick={() => copyTweet(tweet, idx)}
                          aria-label={`Copy tweet ${idx + 1}`}
                        >
                          {copiedTweetIdx === idx ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                      <Textarea
                        className="resize-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent p-0 text-sm leading-relaxed min-h-[60px] w-full"
                        value={tweet}
                        onChange={(e) => updateGeneratedTweet(idx, e.target.value)}
                        aria-label={`Edit tweet ${idx + 1}`}
                      />
                      <p className={`mt-2 text-xs tabular-nums ${tweet.length > 280 ? "text-destructive" : tweet.length >= 240 ? "text-amber-500" : "text-muted-foreground"}`}>
                        {tweet.length}/280
                      </p>
                    </CardContent>
                  </Card>
                ))}
                {/* Pulsing skeleton for the next incoming tweet while streaming */}
                {isGenerating && (
                  <Card className="border border-dashed border-primary/20 animate-pulse">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-8 rounded bg-muted" />
                      </div>
                      <div className="h-3 rounded bg-muted w-full" />
                      <div className="h-3 rounded bg-muted w-4/5" />
                      <div className="h-3 rounded bg-muted w-3/5" />
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5 space-y-4">
                {/* Blurred thread preview */}
                <div className="space-y-2 opacity-30 pointer-events-none select-none blur-[1px]" aria-hidden="true">
                  {[["1/3", "w-full", "w-4/5", "w-3/5"], ["2/3", "w-full", "w-2/3", "w-4/5"], ["3/3", "w-full", "w-3/4", "w-1/2"]].map(([label, ...bars]) => (
                    <div key={label} className="rounded-lg border bg-card p-3 space-y-1.5">
                      <span className="text-xs text-muted-foreground font-medium">{label}</span>
                      {bars.map((w, i) => (
                        <div key={i} className={`h-2.5 bg-muted-foreground/30 rounded ${w}`} />
                      ))}
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm">Your thread will appear here</p>
                  <p className="mt-1 text-xs text-muted-foreground">Enter a topic above and click Generate Thread</p>
                </div>
              </div>
            )}
          </div>
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
                  <span className="text-sm font-medium tabular-nums text-muted-foreground">{urlTweetCount} tweets</span>
                </div>
                <Slider value={[urlTweetCount]} onValueChange={(v) => setUrlTweetCount(v[0] ?? 5)} min={3} max={12} step={1} aria-label="URL thread length" />
              </div>
              <Button className="w-full" onClick={handleUrlGenerate} disabled={urlLoading || !articleUrl.trim()} size="lg">
                {urlLoading ? <><Loader2 className="me-2 h-4 w-4 animate-spin" />Converting... ({urlElapsed}s)</> : <><Sparkles className="me-2 h-4 w-4" />Convert to Thread</>}
              </Button>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            {urlResult ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">{urlResult.tweets.length} tweets</span>
                    {urlResult.title && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{urlResult.title}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyUrlThread} aria-label="Copy all URL thread tweets">
                      {urlCopied ? <><Check className="h-3.5 w-3.5 me-1.5" />Copied</> : <><Copy className="h-3.5 w-3.5 me-1.5" />Copy All</>}
                    </Button>
                    <Button size="sm" onClick={() => sendToComposer(urlResult.tweets, { source: "url-to-thread", tone: urlTone })}>
                      <PenSquare className="h-3.5 w-3.5 me-1.5" />Open in Composer
                    </Button>
                  </div>
                </div>
                {urlResult.tweets.map((tweet, idx) => (
                  <Card key={idx} className="border focus-within:border-primary/40 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <Badge variant="secondary" className="shrink-0 tabular-nums">#{idx + 1}</Badge>
                      </div>
                      <Textarea
                        className="resize-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent p-0 text-sm leading-relaxed min-h-[60px] w-full"
                        value={tweet}
                        onChange={(e) => updateUrlTweet(idx, e.target.value)}
                        aria-label={`Edit URL tweet ${idx + 1}`}
                      />
                      <p className={`mt-2 text-xs tabular-nums ${tweet.length > 280 ? "text-destructive" : tweet.length >= 240 ? "text-amber-500" : "text-muted-foreground"}`}>
                        {tweet.length}/280
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5 space-y-4">
                {/* Article → thread preview */}
                <div className="opacity-30 pointer-events-none select-none blur-[1px] space-y-2" aria-hidden="true">
                  <div className="rounded-lg border bg-card p-3 flex items-center gap-2">
                    <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="h-2.5 bg-muted-foreground/30 rounded w-3/4" />
                  </div>
                  <div className="text-xs text-muted-foreground text-center">↓ converts to</div>
                  {[["1/4", "w-full", "w-4/5"], ["2/4", "w-full", "w-2/3"], ["3/4", "w-3/4", "w-full"]].map(([label, ...bars]) => (
                    <div key={label} className="rounded-lg border bg-card p-2.5 space-y-1.5">
                      <span className="text-xs text-muted-foreground font-medium">{label}</span>
                      {bars.map((w, i) => <div key={i} className={`h-2.5 bg-muted-foreground/30 rounded ${w}`} />)}
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm">Paste a URL to convert</p>
                  <p className="mt-1 text-xs text-muted-foreground">Any article, blog post, or newsletter — we&apos;ll extract and thread it</p>
                </div>
              </div>
            )}
          </div>
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
              <Button className="w-full" onClick={handleVariants} disabled={variantLoading || !variantTweet.trim()} size="lg">
                {variantLoading ? <><Loader2 className="me-2 h-4 w-4 animate-spin" />Generating... ({variantElapsed}s)</> : <><Shuffle className="me-2 h-4 w-4" />Generate 3 Variants</>}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {variants.length === 0 && !variantLoading ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5 space-y-4 h-full">
                <div className="space-y-2 opacity-30 pointer-events-none select-none blur-[1px]" aria-hidden="true">
                  {[["Emotional", "border-rose-500/30 bg-rose-500/5"], ["Factual", "border-blue-500/30 bg-blue-500/5"], ["Question", "border-amber-500/30 bg-amber-500/5"]].map(([label, cls]) => (
                    <div key={label} className={`rounded-lg border p-2.5 space-y-1.5 ${cls}`}>
                      <span className="text-xs font-semibold capitalize">{label}</span>
                      <div className="h-2.5 bg-current/20 rounded w-full opacity-30" />
                      <div className="h-2.5 bg-current/20 rounded w-4/5 opacity-30" />
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm">3 variants will appear here</p>
                  <p className="mt-1 text-xs text-muted-foreground">Each uses a different angle: emotional, factual, and question</p>
                </div>
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
                        <Button size="sm" variant="ghost" onClick={() => copyVariant(v.text, idx)} aria-label={`Copy variant ${idx + 1}`}>
                          {variantCopied === idx ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => applyVariant(v.text)}>
                          Use
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => sendToComposer([v.text], { source: "ai-writer" })} aria-label={`Open variant ${idx + 1} in Composer`}>
                          <PenSquare className="h-3.5 w-3.5" />
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
  );
}

export default function AIWriterPage() {
  return (
    <DashboardPageWrapper
      icon={Bot}
      title="AI Writer"
      description="Enter a topic and tone to generate a ready-to-post thread — or convert URLs, create A/B variants, and find hashtags."
    >
      <AIWriterContent />
    </DashboardPageWrapper>
  );
}
