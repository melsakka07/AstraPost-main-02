"use client";

import { useState, useEffect } from "react";
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
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { HashtagGenerator } from "@/components/ai/hashtag-generator";
import { AiLengthSelector } from "@/components/composer/ai-length-selector";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { useElapsedTime } from "@/hooks/use-elapsed-time";
import { useSession } from "@/lib/auth-client";
import { sendToComposer } from "@/lib/composer-bridge";
import { type AiLengthOptionId } from "@/lib/schemas/common";
import { getMaxCharacterLimit } from "@/lib/services/x-subscription";
import { cn } from "@/lib/utils";

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
  const t = useTranslations("ai_writer");
  const langT = useTranslations("languages");
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
  // --- Mode / Length / X Tier ---
  const [mode, setMode] = useState<"thread" | "single">("thread");
  const [lengthOption, setLengthOption] = useState<AiLengthOptionId>("short");
  const { data: session } = useSession();
  const [xTier, setXTier] = useState<string | null>(null);
  const [xAccountId, setXAccountId] = useState<string | null>(null);

  const threadElapsed = useElapsedTime(isGenerating);

  // Fetch the user's default X account tier for length-option gating
  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/accounts");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const accounts: Array<{ platform: string; xSubscriptionTier?: string | null; id: string }> =
          data.accounts || [];
        const xAccount = accounts.find((a) => a.platform === "twitter");
        if (xAccount && !cancelled) {
          setXTier(xAccount.xSubscriptionTier ?? null);
          setXAccountId(xAccount.id ?? null);
        }
      } catch {
        // Silently degrade — length options default to short-only
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const isSingle = mode === "single";
      const res = await fetch("/api/ai/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          tone,
          language,
          mode: isSingle ? "single" : "thread",
          ...(isSingle ? { lengthOption } : { tweetCount }),
          ...(isSingle && xAccountId ? { targetAccountId: xAccountId } : {}),
        }),
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
        if (res.status === 403) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          toast.error(body.error ?? "X Premium required for this length option.");
          return;
        }
        throw new Error("Failed to generate");
      }

      if (isSingle) {
        // Single-post mode: plain text response
        const text = await res.text();
        if (!text || text.trim().length === 0) throw new Error("No content generated");
        setGeneratedTweets([text.trim()]);
        return;
      }

      // Thread mode: SSE stream
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });

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
              toast.error(t("errors.generation_failed"));
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
      toast.error(t("errors.generation_failed"));
    } finally {
      setIsGenerating(false);
    }
  };

  const copyAllTweets = () => {
    navigator.clipboard.writeText(generatedTweets.join("\n\n---\n\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    toast.success(t("toasts.copied"));
  };

  const copyTweet = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedTweetIdx(idx);
    toast.success(t("toasts.copied"));
    setTimeout(() => setCopiedTweetIdx(null), 2000);
  };

  const updateGeneratedTweet = (idx: number, text: string) => {
    setGeneratedTweets((prev) => prev.map((t, i) => (i === idx ? text : t)));
  };

  const updateUrlTweet = (idx: number, text: string) => {
    setUrlResult((prev) =>
      prev ? { ...prev, tweets: prev.tweets.map((t, i) => (i === idx ? text : t)) } : null
    );
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
        body: JSON.stringify({
          url: articleUrl,
          language: urlLanguage,
          tweetCount: urlTweetCount,
          tone: urlTone,
        }),
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
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? t("errors.generation_failed"));
        return;
      }
      const data = (await res.json()) as { tweets: string[]; title: string };
      setUrlResult(data);
    } catch {
      toast.error(t("errors.generation_failed"));
    } finally {
      setUrlLoading(false);
    }
  };

  const copyUrlThread = () => {
    if (!urlResult) return;
    navigator.clipboard.writeText(urlResult.tweets.join("\n\n---\n\n"));
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
    toast.success(t("toasts.copied"));
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
        throw new Error("Failed to generate variants");
      }
      const data = (await res.json()) as { variants: Variant[] };
      setVariants(data.variants);
    } catch {
      toast.error(t("errors.generation_failed"));
    } finally {
      setVariantLoading(false);
    }
  };

  const copyVariant = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setVariantCopied(idx);
    setTimeout(() => setVariantCopied(null), 2000);
    toast.success(t("toasts.copied"));
  };

  const applyVariant = (text: string) => {
    setVariantTweet(text);
    toast.success(t("toasts.loaded_editor"));
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as ActiveTab)}
      className="space-y-6"
    >
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="thread">
          <PenTool className="me-1.5 h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("tabs.thread")}</span>
          <span className="sm:hidden">{t("tabs.thread")}</span>
        </TabsTrigger>
        <TabsTrigger value="url">
          <Link2 className="me-1.5 h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("tabs.url")}</span>
          <span className="sm:hidden">{t("tabs.url")}</span>
        </TabsTrigger>
        <TabsTrigger value="variants">
          <Shuffle className="me-1.5 h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("tabs.variants")}</span>
          <span className="sm:hidden">{t("tabs.variants")}</span>
        </TabsTrigger>
        <TabsTrigger value="hashtags">
          <Hash className="me-1.5 h-3.5 w-3.5" />
          {t("tabs.hashtags")}
        </TabsTrigger>
      </TabsList>

      {/* ── Thread Writer Tab ── */}
      <TabsContent value="thread" className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenTool className="text-primary h-5 w-5" />
                {t("topic_label")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="topic">{t("topic_label")}</Label>
                <Textarea
                  id="topic"
                  placeholder={t("topic_placeholder")}
                  className="min-h-[120px] resize-none"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("tone_label")}</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">{t("tone.professional")}</SelectItem>
                      <SelectItem value="casual">{t("tone.casual")}</SelectItem>
                      <SelectItem value="humorous">{t("tone.humorous")}</SelectItem>
                      <SelectItem value="controversial">{t("tone.controversial")}</SelectItem>
                      <SelectItem value="educational">{t("tone.educational")}</SelectItem>
                      <SelectItem value="inspirational">{t("tone.inspirational")}</SelectItem>
                      <SelectItem value="viral">{t("tone.viral")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    <Globe className="me-1 inline h-3.5 w-3.5" />
                    {t("language_label")}
                  </Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">{langT("ar")}</SelectItem>
                      <SelectItem value="en">{langT("en")}</SelectItem>
                      <SelectItem value="fr">{langT("fr")}</SelectItem>
                      <SelectItem value="de">{langT("de")}</SelectItem>
                      <SelectItem value="es">{langT("es")}</SelectItem>
                      <SelectItem value="it">{langT("it")}</SelectItem>
                      <SelectItem value="pt">{langT("pt")}</SelectItem>
                      <SelectItem value="tr">{langT("tr")}</SelectItem>
                      <SelectItem value="ru">{langT("ru")}</SelectItem>
                      <SelectItem value="hi">{langT("hi")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Mode toggle: Thread vs Single Post */}
              <div className="space-y-2">
                <Label>{t("output_mode_label")}</Label>
                <div className="bg-muted/50 grid grid-cols-2 gap-1 rounded-lg border p-1">
                  <button
                    type="button"
                    className={cn(
                      "rounded-md px-3 py-2 text-sm font-medium transition-all",
                      mode === "thread"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    onClick={() => setMode("thread")}
                  >
                    {t("mode_thread")}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "rounded-md px-3 py-2 text-sm font-medium transition-all",
                      mode === "single"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    onClick={() => setMode("single")}
                  >
                    {t("mode_single")}
                  </button>
                </div>
              </div>

              {/* AiLengthSelector — only for single-post mode */}
              {mode === "single" && (
                <AiLengthSelector
                  selectedLength={lengthOption}
                  onLengthChange={setLengthOption}
                  xSubscriptionTier={xTier as any}
                />
              )}

              {/* Thread Length slider — only for thread mode */}
              {mode === "thread" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>{t("length_label")}</Label>
                    <span className="text-muted-foreground text-sm font-medium tabular-nums">
                      {t("tweets_count", { count: tweetCount, max: 15 })}
                    </span>
                  </div>
                  <Slider
                    value={[tweetCount]}
                    onValueChange={(v) => setTweetCount(v[0] ?? 5)}
                    min={3}
                    max={15}
                    step={1}
                    aria-label={t("length_label")}
                  />
                  <div className="text-muted-foreground flex justify-between text-xs">
                    <span>{t("length_short")} (3)</span>
                    <span>{t("length_long")} (15)</span>
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={isGenerating || !topic}
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {t("generating")} ({threadElapsed}s)
                  </>
                ) : (
                  <>
                    <Sparkles className="me-2 h-4 w-4" />
                    {mode === "single" ? t("generate_post") : t("generate_thread")}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            {generatedTweets.length > 0 ? (
              <>
                {mode === "single" ? (
                  /* ── Single-post result ── */
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm font-medium">
                        {isGenerating ? t("generating") : t("generated_post")}
                      </span>
                      {!isGenerating && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(generatedTweets[0] ?? "");
                              setCopiedAll(true);
                              setTimeout(() => setCopiedAll(false), 2000);
                              toast.success(t("copy"));
                            }}
                            aria-label={t("copy")}
                          >
                            {copiedAll ? (
                              <>
                                <Check className="me-1.5 h-3.5 w-3.5" />
                                {t("copy")}
                              </>
                            ) : (
                              <>
                                <Copy className="me-1.5 h-3.5 w-3.5" />
                                {t("copy")}
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              sendToComposer(generatedTweets, { source: "ai-writer", tone })
                            }
                          >
                            <PenSquare className="me-1.5 h-3.5 w-3.5" />
                            {t("open_composer")}
                          </Button>
                        </div>
                      )}
                    </div>
                    <Card className="focus-within:border-primary/40 border transition-colors">
                      <CardContent className="p-4">
                        <Textarea
                          className="min-h-[120px] w-full resize-none border-0 bg-transparent p-0 text-sm leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                          value={generatedTweets[0] ?? ""}
                          onChange={(e) => updateGeneratedTweet(0, e.target.value)}
                          aria-label="Edit generated post"
                        />
                        <p
                          className={`mt-2 text-xs tabular-nums ${(generatedTweets[0]?.length ?? 0) > getMaxCharacterLimit(xTier as any) ? "text-destructive" : (generatedTweets[0]?.length ?? 0) >= getMaxCharacterLimit(xTier as any) * 0.9 ? "text-amber-500" : "text-muted-foreground"}`}
                        >
                          {generatedTweets[0]?.length ?? 0}/{getMaxCharacterLimit(xTier as any)}
                        </p>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  /* ── Thread results ── */
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm font-medium">
                        {isGenerating
                          ? `Generating ${generatedTweets.length} / ${tweetCount}…`
                          : `${generatedTweets.length} tweets`}
                      </span>
                      {!isGenerating && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={copyAllTweets}
                            aria-label="Copy all tweets"
                          >
                            {copiedAll ? (
                              <>
                                <Check className="me-1.5 h-3.5 w-3.5" />
                                {t("copy")}
                              </>
                            ) : (
                              <>
                                <Copy className="me-1.5 h-3.5 w-3.5" />
                                {t("copy_all")}
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              sendToComposer(generatedTweets, { source: "ai-writer", tone })
                            }
                          >
                            <PenSquare className="me-1.5 h-3.5 w-3.5" />
                            {t("open_composer")}
                          </Button>
                        </div>
                      )}
                    </div>
                    {generatedTweets.map((tweet, idx) => (
                      <Card
                        key={idx}
                        className="focus-within:border-primary/40 border transition-colors"
                      >
                        <CardContent className="p-4">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <Badge variant="secondary" className="shrink-0 tabular-nums">
                              #{idx + 1}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-10 min-h-[44px] w-10 min-w-[44px] shrink-0 p-0"
                              onClick={() => copyTweet(tweet, idx)}
                              aria-label={`Copy tweet ${idx + 1}`}
                            >
                              {copiedTweetIdx === idx ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                          <Textarea
                            className="min-h-[60px] w-full resize-none border-0 bg-transparent p-0 text-sm leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            value={tweet}
                            onChange={(e) => updateGeneratedTweet(idx, e.target.value)}
                            aria-label={`Edit tweet ${idx + 1}`}
                          />
                          <p
                            className={`mt-2 text-xs tabular-nums ${tweet.length > 280 ? "text-destructive" : tweet.length >= 240 ? "text-amber-500" : "text-muted-foreground"}`}
                          >
                            {tweet.length}/280
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                    {/* Pulsing skeleton for the next incoming tweet while streaming */}
                    {isGenerating && (
                      <Card className="border-primary/20 animate-pulse border border-dashed">
                        <CardContent className="space-y-2 p-4">
                          <div className="flex items-center gap-2">
                            <div className="bg-muted h-5 w-8 rounded" />
                          </div>
                          <div className="bg-muted h-3 w-full rounded" />
                          <div className="bg-muted h-3 w-4/5 rounded" />
                          <div className="bg-muted h-3 w-3/5 rounded" />
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="border-border bg-muted/20 space-y-4 rounded-xl border border-dashed p-5">
                {/* Blurred thread preview */}
                <div
                  className="pointer-events-none space-y-2 opacity-30 blur-[1px] select-none"
                  aria-hidden="true"
                >
                  {[
                    ["1/3", "w-full", "w-4/5", "w-3/5"],
                    ["2/3", "w-full", "w-2/3", "w-4/5"],
                    ["3/3", "w-full", "w-3/4", "w-1/2"],
                  ].map(([label, ...bars]) => (
                    <div key={label} className="bg-card space-y-1.5 rounded-lg border p-3">
                      <span className="text-muted-foreground text-xs font-medium">{label}</span>
                      {bars.map((w, i) => (
                        <div key={i} className={`bg-muted-foreground/30 h-2.5 rounded ${w}`} />
                      ))}
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{t("empty_state")}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {t("empty_state_description")}
                  </p>
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
                <Link2 className="text-primary h-5 w-5" />
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
                <p className="text-muted-foreground text-xs">
                  Paste any publicly accessible article, blog post, or news URL.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={urlTone} onValueChange={setUrlTone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">{langT("ar")}</SelectItem>
                      <SelectItem value="en">{langT("en")}</SelectItem>
                      <SelectItem value="fr">{langT("fr")}</SelectItem>
                      <SelectItem value="de">{langT("de")}</SelectItem>
                      <SelectItem value="es">{langT("es")}</SelectItem>
                      <SelectItem value="it">{langT("it")}</SelectItem>
                      <SelectItem value="pt">{langT("pt")}</SelectItem>
                      <SelectItem value="tr">{langT("tr")}</SelectItem>
                      <SelectItem value="ru">{langT("ru")}</SelectItem>
                      <SelectItem value="hi">{langT("hi")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Thread Length</Label>
                  <span className="text-muted-foreground text-sm font-medium tabular-nums">
                    {urlTweetCount} tweets
                  </span>
                </div>
                <Slider
                  value={[urlTweetCount]}
                  onValueChange={(v) => setUrlTweetCount(v[0] ?? 5)}
                  min={3}
                  max={12}
                  step={1}
                  aria-label="URL thread length"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleUrlGenerate}
                disabled={urlLoading || !articleUrl.trim()}
                size="lg"
              >
                {urlLoading ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    Converting... ({urlElapsed}s)
                  </>
                ) : (
                  <>
                    <Sparkles className="me-2 h-4 w-4" />
                    {t("convert_to_thread")}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            {urlResult ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-muted-foreground text-sm font-medium">
                      {urlResult.tweets.length} tweets
                    </span>
                    {urlResult.title && (
                      <p className="text-muted-foreground max-w-[200px] truncate text-xs">
                        {urlResult.title}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyUrlThread}
                      aria-label={t("copy_all")}
                    >
                      {urlCopied ? (
                        <>
                          <Check className="me-1.5 h-3.5 w-3.5" />
                          {t("copy")}
                        </>
                      ) : (
                        <>
                          <Copy className="me-1.5 h-3.5 w-3.5" />
                          {t("copy_all")}
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        sendToComposer(urlResult.tweets, { source: "url-to-thread", tone: urlTone })
                      }
                    >
                      <PenSquare className="me-1.5 h-3.5 w-3.5" />
                      {t("open_composer")}
                    </Button>
                  </div>
                </div>
                {urlResult.tweets.map((tweet, idx) => (
                  <Card
                    key={idx}
                    className="focus-within:border-primary/40 border transition-colors"
                  >
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <Badge variant="secondary" className="shrink-0 tabular-nums">
                          #{idx + 1}
                        </Badge>
                      </div>
                      <Textarea
                        className="min-h-[60px] w-full resize-none border-0 bg-transparent p-0 text-sm leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        value={tweet}
                        onChange={(e) => updateUrlTweet(idx, e.target.value)}
                        aria-label={`Edit URL tweet ${idx + 1}`}
                      />
                      <p
                        className={`mt-2 text-xs tabular-nums ${tweet.length > 280 ? "text-destructive" : tweet.length >= 240 ? "text-amber-500" : "text-muted-foreground"}`}
                      >
                        {tweet.length}/280
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <div className="border-border bg-muted/20 space-y-4 rounded-xl border border-dashed p-5">
                {/* Article → thread preview */}
                <div
                  className="pointer-events-none space-y-2 opacity-30 blur-[1px] select-none"
                  aria-hidden="true"
                >
                  <div className="bg-card flex items-center gap-2 rounded-lg border p-3">
                    <Link2 className="text-muted-foreground h-4 w-4 shrink-0" />
                    <div className="bg-muted-foreground/30 h-2.5 w-3/4 rounded" />
                  </div>
                  <div className="text-muted-foreground text-center text-xs">↓ converts to</div>
                  {[
                    ["1/4", "w-full", "w-4/5"],
                    ["2/4", "w-full", "w-2/3"],
                    ["3/4", "w-3/4", "w-full"],
                  ].map(([label, ...bars]) => (
                    <div key={label} className="bg-card space-y-1.5 rounded-lg border p-2.5">
                      <span className="text-muted-foreground text-xs font-medium">{label}</span>
                      {bars.map((w, i) => (
                        <div key={i} className={`bg-muted-foreground/30 h-2.5 rounded ${w}`} />
                      ))}
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Paste a URL to convert</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Any article, blog post, or newsletter — we&apos;ll extract and thread it
                  </p>
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
                <Shuffle className="text-primary h-5 w-5" />
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
                <p className="text-muted-foreground text-xs">{variantTweet.length} chars</p>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={variantLanguage} onValueChange={setVariantLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">{langT("ar")}</SelectItem>
                    <SelectItem value="en">{langT("en")}</SelectItem>
                    <SelectItem value="fr">{langT("fr")}</SelectItem>
                    <SelectItem value="de">{langT("de")}</SelectItem>
                    <SelectItem value="es">{langT("es")}</SelectItem>
                    <SelectItem value="it">{langT("it")}</SelectItem>
                    <SelectItem value="pt">{langT("pt")}</SelectItem>
                    <SelectItem value="tr">{langT("tr")}</SelectItem>
                    <SelectItem value="ru">{langT("ru")}</SelectItem>
                    <SelectItem value="hi">{langT("hi")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={handleVariants}
                disabled={variantLoading || !variantTweet.trim()}
                size="lg"
              >
                {variantLoading ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {t("generating")} ({variantElapsed}s)
                  </>
                ) : (
                  <>
                    <Shuffle className="me-2 h-4 w-4" />
                    {t("generate_variants")}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {variants.length === 0 && !variantLoading ? (
              <div className="border-border bg-muted/20 h-full space-y-4 rounded-xl border border-dashed p-5">
                <div
                  className="pointer-events-none space-y-2 opacity-30 blur-[1px] select-none"
                  aria-hidden="true"
                >
                  {[
                    ["Emotional", "border-rose-500/30 bg-rose-500/5"],
                    ["Factual", "border-blue-500/30 bg-blue-500/5"],
                    ["Question", "border-amber-500/30 bg-amber-500/5"],
                  ].map(([label, cls]) => (
                    <div key={label} className={`space-y-1.5 rounded-lg border p-2.5 ${cls}`}>
                      <span className="text-xs font-semibold capitalize">{label}</span>
                      <div className="h-2.5 w-full rounded bg-current/20 opacity-30" />
                      <div className="h-2.5 w-4/5 rounded bg-current/20 opacity-30" />
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{t("variants_empty")}</p>
                  <p className="text-muted-foreground mt-1 text-xs">{t("variants_description")}</p>
                </div>
              </div>
            ) : variantLoading ? (
              <div className="border-border bg-muted/20 flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-12">
                <Loader2 className="text-primary h-8 w-8 animate-spin" />
                <p className="text-muted-foreground text-sm">{t("generating")}</p>
              </div>
            ) : (
              variants.map((v, idx) => (
                <Card key={idx} className="hover:border-primary/30 transition-colors">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${ANGLE_COLORS[v.angle] ?? ""}`}
                      >
                        {v.angle}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="min-h-[44px] min-w-[44px]"
                          onClick={() => copyVariant(v.text, idx)}
                          aria-label={`Copy variant ${idx + 1}`}
                        >
                          {variantCopied === idx ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="min-h-[44px] min-w-[44px]"
                          onClick={() => applyVariant(v.text)}
                          aria-label={t("use")}
                        >
                          {t("use")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="min-h-[44px] min-w-[44px]"
                          onClick={() => sendToComposer([v.text], { source: "ai-writer" })}
                          aria-label={`Open variant ${idx + 1} in Composer`}
                        >
                          <PenSquare className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed">{v.text}</p>
                    <p className="text-muted-foreground text-xs italic">{v.rationale}</p>
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
  const t = useTranslations("ai_writer");
  return (
    <DashboardPageWrapper icon={Bot} title={t("title")} description={t("description")}>
      <AIWriterContent />
    </DashboardPageWrapper>
  );
}
