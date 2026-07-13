"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Globe, PenTool, Sparkles, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AiQuotaChip } from "@/components/ai/ai-quota-chip";
import { AiResultActions, AiResultItemActions } from "@/components/ai/shared/ai-result-actions";
import { AiLengthSelector } from "@/components/composer/ai-length-selector";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { useElapsedTime } from "@/hooks/use-elapsed-time";
import { useSession } from "@/lib/auth-client";
import { copyToClipboard } from "@/lib/clipboard";
import { sendToComposer } from "@/lib/composer-bridge";
import { type AiLengthOptionId, type XSubscriptionTier } from "@/lib/schemas/common";
import type { MonthlyAiUsage } from "@/lib/services/ai-quota";
import { computeTweetCharCount, type TweetCharSeverity } from "@/lib/tweet-char";
import { parsePlanLimitResponse } from "@/lib/types/plan-limit";
import { cn } from "@/lib/utils";

/** Maps shared char-count severity to a semantic counter colour. */
const SEVERITY_TEXT_CLASS: Record<TweetCharSeverity, string> = {
  over: "text-destructive",
  warning: "text-warning-11",
  ok: "text-muted-foreground",
};

interface AIWriterClientProps {
  aiUsage: MonthlyAiUsage | null;
  imageUsage: MonthlyAiUsage | null;
}

export function AIWriterClient({ aiUsage, imageUsage }: AIWriterClientProps) {
  const searchParams = useSearchParams();
  const t = useTranslations("ai_writer");
  const tCommon = useTranslations("common");
  const langT = useTranslations("languages");
  const initialTopic = searchParams?.get("topic") ?? "";
  const { openWithContext } = useUpgradeModal();

  // --- Thread Writer State ---
  const [topic, setTopic] = useState(initialTopic);
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

  // --- Advanced tones disclosure toggle ---
  const [showAdvancedTones, setShowAdvancedTones] = useState(false);

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
          const payload = await parsePlanLimitResponse(res);
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

  const copyAllTweets = async () => {
    const ok = await copyToClipboard(generatedTweets.join("\n\n---\n\n"));
    if (!ok) {
      toast.error(tCommon("copy_failed"));
      return;
    }
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    toast.success(t("toasts.copied"), { id: "copy" });
  };

  const copyTweet = async (text: string, idx: number) => {
    const ok = await copyToClipboard(text);
    if (!ok) {
      toast.error(tCommon("copy_failed"));
      return;
    }
    setCopiedTweetIdx(idx);
    toast.success(t("toasts.copied"), { id: "copy" });
    setTimeout(() => setCopiedTweetIdx(null), 2000);
  };

  const updateGeneratedTweet = (idx: number, text: string) => {
    setGeneratedTweets((prev) => prev.map((t, i) => (i === idx ? text : t)));
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Breadcrumb items={[{ label: t("tab_meta.thread.title") }]} className="mb-0" />
        <AiQuotaChip aiUsage={aiUsage} imageUsage={imageUsage} />
      </div>

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
                    <SelectItem value="educational">{t("tone.educational")}</SelectItem>
                    <SelectItem value="inspirational">{t("tone.inspirational")}</SelectItem>
                    <SelectItem value="attention_grabbing">
                      {t("tones.attention_grabbing")}
                    </SelectItem>
                    <SelectSeparator />
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground relative flex w-full cursor-pointer items-center gap-1.5 rounded-sm py-1.5 ps-2 pe-2 text-xs outline-none select-none"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowAdvancedTones(!showAdvancedTones);
                      }}
                      title={t("advanced_tones_tooltip")}
                    >
                      {showAdvancedTones ? (
                        <ChevronDown className="h-3 w-3 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3 w-3 shrink-0" />
                      )}
                      <span>{t("advanced_tones")}</span>
                    </button>
                    {showAdvancedTones && (
                      <SelectItem value="controversial">{t("tone.controversial")}</SelectItem>
                    )}
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
                xSubscriptionTier={xTier as XSubscriptionTier | null}
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
                  {t("generating")}
                  {threadElapsed >= 5 ? ` (${threadElapsed}s)` : ""}
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
                  {!isGenerating && (
                    <AiResultActions
                      itemCount={1}
                      onRegenerate={handleGenerate}
                      onSendToComposer={() =>
                        sendToComposer(generatedTweets, { source: "ai-writer", tone })
                      }
                    />
                  )}
                  <Card className="focus-within:border-primary/40 border transition-colors">
                    <CardContent className="p-4">
                      <div className="mb-2 flex justify-end">
                        <AiResultItemActions
                          text={generatedTweets[0] ?? ""}
                          index={0}
                          onCopy={copyTweet}
                          copied={copiedTweetIdx === 0}
                        />
                      </div>
                      <Textarea
                        className="min-h-[120px] w-full resize-none border-0 bg-transparent p-0 text-sm leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        value={generatedTweets[0] ?? ""}
                        onChange={(e) => updateGeneratedTweet(0, e.target.value)}
                        aria-label="Edit generated post"
                      />
                      {(() => {
                        const c = computeTweetCharCount(generatedTweets[0] ?? "", {
                          tier: xTier as XSubscriptionTier | null,
                        });
                        return (
                          <p
                            className={cn(
                              "mt-2 text-xs tabular-nums",
                              SEVERITY_TEXT_CLASS[c.severity]
                            )}
                          >
                            {c.charCount}/{c.maxChars}
                          </p>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </>
              ) : (
                /* ── Thread results ── */
                <>
                  {isGenerating ? (
                    <span className="text-muted-foreground text-sm font-medium">
                      Generating {generatedTweets.length} / {tweetCount}…
                    </span>
                  ) : (
                    <AiResultActions
                      itemCount={generatedTweets.length}
                      onRegenerate={handleGenerate}
                      onCopyAll={copyAllTweets}
                      copyAllState={copiedAll ? "copied" : "idle"}
                      onSendToComposer={() =>
                        sendToComposer(generatedTweets, { source: "ai-writer", tone })
                      }
                    />
                  )}
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
                          <AiResultItemActions
                            text={tweet}
                            index={idx}
                            onCopy={copyTweet}
                            copied={copiedTweetIdx === idx}
                            onSendToComposer={(text) =>
                              sendToComposer([text], { source: "ai-writer", tone })
                            }
                          />
                        </div>
                        <Textarea
                          className="min-h-[60px] w-full resize-none border-0 bg-transparent p-0 text-sm leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                          value={tweet}
                          onChange={(e) => updateGeneratedTweet(idx, e.target.value)}
                          aria-label={`Edit tweet ${idx + 1}`}
                        />
                        {(() => {
                          const c = computeTweetCharCount(tweet, {
                            tier: xTier as XSubscriptionTier | null,
                          });
                          return (
                            <p
                              className={cn(
                                "mt-2 text-xs tabular-nums",
                                SEVERITY_TEXT_CLASS[c.severity]
                              )}
                            >
                              {c.charCount}/{c.maxChars}
                            </p>
                          );
                        })()}
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
                <p className="text-muted-foreground mt-1 text-xs">{t("empty_state_description")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
