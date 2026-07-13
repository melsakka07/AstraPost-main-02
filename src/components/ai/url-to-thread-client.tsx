"use client";

import { useState } from "react";
import { Link2, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AiQuotaChip } from "@/components/ai/ai-quota-chip";
import { PiiRedactionBanner } from "@/components/ai/pii-redaction-banner";
import { AiResultActions, AiResultItemActions } from "@/components/ai/shared/ai-result-actions";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
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
import { Textarea } from "@/components/ui/textarea";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { useElapsedTime } from "@/hooks/use-elapsed-time";
import { copyToClipboard } from "@/lib/clipboard";
import { sendToComposer } from "@/lib/composer-bridge";
import type { MonthlyAiUsage } from "@/lib/services/ai-quota";
import { computeTweetCharCount } from "@/lib/tweet-char";
import { parsePlanLimitResponse } from "@/lib/types/plan-limit";
import { cn } from "@/lib/utils";

interface UrlToThreadClientProps {
  aiUsage: MonthlyAiUsage | null;
  imageUsage: MonthlyAiUsage | null;
}

export function UrlToThreadClient({ aiUsage, imageUsage }: UrlToThreadClientProps) {
  const t = useTranslations("ai_writer");
  const tCommon = useTranslations("common");
  const langT = useTranslations("languages");
  const { openWithContext } = useUpgradeModal();

  const [articleUrl, setArticleUrl] = useState("");
  const [urlTone, setUrlTone] = useState("educational");
  const [urlLanguage, setUrlLanguage] = useState("en");
  const [urlTweetCount, setUrlTweetCount] = useState(5);
  const [urlResult, setUrlResult] = useState<{
    tweets: string[];
    title: string;
    redactions?: string[];
  } | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [copiedTweetIdx, setCopiedTweetIdx] = useState<number | null>(null);
  const urlElapsed = useElapsedTime(urlLoading);

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

  const updateUrlTweet = (idx: number, text: string) => {
    setUrlResult((prev) =>
      prev ? { ...prev, tweets: prev.tweets.map((tw, i) => (i === idx ? text : tw)) } : null
    );
  };

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
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? t("errors.generation_failed"));
        return;
      }
      const data = (await res.json()) as { tweets: string[]; title: string; redactions?: string[] };
      setUrlResult(data);
    } catch {
      toast.error(t("errors.generation_failed"));
    } finally {
      setUrlLoading(false);
    }
  };

  const copyUrlThread = async () => {
    if (!urlResult) return;
    const ok = await copyToClipboard(urlResult.tweets.join("\n\n---\n\n"));
    if (!ok) {
      toast.error(tCommon("copy_failed"));
      return;
    }
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
    toast.success(t("toasts.copied"), { id: "copy" });
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Breadcrumb items={[{ label: t("tab_meta.url.title") }]} className="mb-0" />
        <AiQuotaChip aiUsage={aiUsage} imageUsage={imageUsage} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="text-primary h-5 w-5" />
              {t("url.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="articleUrl">{t("url.input_label")}</Label>
              <Input
                id="articleUrl"
                placeholder={t("url.placeholder")}
                value={articleUrl}
                onChange={(e) => setArticleUrl(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">{t("url.description")}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("tone_label")}</Label>
                <Select value={urlTone} onValueChange={setUrlTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="educational">{t("tone.educational")}</SelectItem>
                    <SelectItem value="casual">{t("tone.casual")}</SelectItem>
                    <SelectItem value="professional">{t("tone.professional")}</SelectItem>
                    <SelectItem value="inspirational">{t("tone.inspirational")}</SelectItem>
                    <SelectItem value="attention_grabbing">
                      {t("tones.attention_grabbing")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("url.output_language")}</Label>
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
                <Label>{t("url.thread_length")}</Label>
                <span className="text-muted-foreground text-sm font-medium tabular-nums">
                  {t("url.tweets_count", { count: urlTweetCount })}
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
                  {t("url.converting")}
                  {urlElapsed >= 5 ? ` (${urlElapsed}s)` : ""}
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
              <PiiRedactionBanner redactions={urlResult.redactions} />
              <AiResultActions
                itemCount={urlResult.tweets.length}
                onRegenerate={handleUrlGenerate}
                onCopyAll={copyUrlThread}
                copyAllState={urlCopied ? "copied" : "idle"}
                onSendToComposer={() =>
                  sendToComposer(urlResult.tweets, {
                    source: "url-to-thread",
                    tone: urlTone,
                  })
                }
              />
              {urlResult.title && (
                <p className="text-muted-foreground max-w-[200px] truncate text-xs">
                  {urlResult.title}
                </p>
              )}
              {urlResult.tweets.map((tweet, idx) => (
                <Card key={idx} className="focus-within:border-primary/40 border transition-colors">
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
                          sendToComposer([text], {
                            source: "url-to-thread",
                            tone: urlTone,
                          })
                        }
                      />
                    </div>
                    <Textarea
                      className="min-h-[60px] w-full resize-none border-0 bg-transparent p-0 text-sm leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      value={tweet}
                      onChange={(e) => updateUrlTweet(idx, e.target.value)}
                      aria-label={`Edit URL tweet ${idx + 1}`}
                    />
                    {(() => {
                      const c = computeTweetCharCount(tweet, { tier: null });
                      return (
                        <p
                          className={cn(
                            "mt-2 text-xs tabular-nums",
                            c.severity === "over"
                              ? "text-destructive"
                              : c.severity === "warning"
                                ? "text-warning-11"
                                : "text-muted-foreground"
                          )}
                        >
                          {c.charCount}/{c.maxChars}
                        </p>
                      );
                    })()}
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <div className="border-border bg-muted/20 space-y-4 rounded-xl border border-dashed p-5">
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
                <p className="text-sm font-medium">{t("url.placeholder")}</p>
                <p className="text-muted-foreground mt-1 text-xs">{t("url.description")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
