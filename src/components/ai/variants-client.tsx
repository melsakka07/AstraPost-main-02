"use client";

import { useState } from "react";
import { Loader2, Shuffle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AiQuotaChip } from "@/components/ai/ai-quota-chip";
import { AiResultItemActions } from "@/components/ai/shared/ai-result-actions";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { useElapsedTime } from "@/hooks/use-elapsed-time";
import { copyToClipboard } from "@/lib/clipboard";
import { sendToComposer } from "@/lib/composer-bridge";
import type { MonthlyAiUsage } from "@/lib/services/ai-quota";
import { parsePlanLimitResponse } from "@/lib/types/plan-limit";
import { cn } from "@/lib/utils";

interface Variant {
  text: string;
  angle: string;
  rationale: string;
}

const ANGLE_COLORS: Record<string, string> = {
  emotional: "bg-chart-5/10 text-chart-5 border-chart-5/20",
  factual: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  question: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  story: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  list: "bg-chart-1/10 text-chart-1 border-chart-1/20",
};

interface VariantsClientProps {
  aiUsage: MonthlyAiUsage | null;
  imageUsage: MonthlyAiUsage | null;
}

export function VariantsClient({ aiUsage, imageUsage }: VariantsClientProps) {
  const t = useTranslations("ai_writer");
  const tCommon = useTranslations("common");
  const langT = useTranslations("languages");
  const { openWithContext } = useUpgradeModal();

  const [variantTweet, setVariantTweet] = useState("");
  const [variantLanguage, setVariantLanguage] = useState("en");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantLoading, setVariantLoading] = useState(false);
  const [variantCopied, setVariantCopied] = useState<number | null>(null);
  const variantElapsed = useElapsedTime(variantLoading);

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

  const copyVariant = async (text: string, idx: number) => {
    const ok = await copyToClipboard(text);
    if (!ok) {
      toast.error(tCommon("copy_failed"));
      return;
    }
    setVariantCopied(idx);
    setTimeout(() => setVariantCopied(null), 2000);
    toast.success(t("toasts.copied"), { id: "copy" });
  };

  const applyVariant = (text: string) => {
    setVariantTweet(text);
    toast.success(t("toasts.loaded_editor"));
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Breadcrumb items={[{ label: t("tab_meta.variants.title") }]} className="mb-0" />
        <AiQuotaChip aiUsage={aiUsage} imageUsage={imageUsage} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shuffle className="text-primary h-5 w-5" />
              {t("variants.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="variantTweet">{t("variants.original_tweet_label")}</Label>
              <Textarea
                id="variantTweet"
                placeholder={t("variants.paste_placeholder")}
                className="min-h-[120px] resize-none"
                value={variantTweet}
                onChange={(e) => setVariantTweet(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                {t("variants.chars", { count: variantTweet.length })}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t("language_label")}</Label>
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
                  {t("generating")}
                  {variantElapsed >= 5 ? ` (${variantElapsed}s)` : ""}
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
                  ["Emotional", "border-danger-6 bg-danger-3"],
                  ["Factual", "border-info-6 bg-info-3"],
                  ["Question", "border-warning-6 bg-warning-3"],
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
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                        ANGLE_COLORS[v.angle] ?? ""
                      )}
                    >
                      {v.angle}
                    </span>
                    <AiResultItemActions
                      text={v.text}
                      index={idx}
                      onCopy={copyVariant}
                      copied={variantCopied === idx}
                      onSendToComposer={(text) => sendToComposer([text], { source: "ai-writer" })}
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        className="min-h-[44px] min-w-[44px]"
                        onClick={() => applyVariant(v.text)}
                        aria-label={t("use")}
                      >
                        {t("use")}
                      </Button>
                    </AiResultItemActions>
                  </div>
                  <p className="text-sm leading-relaxed">{v.text}</p>
                  <p className="text-muted-foreground text-xs italic">{v.rationale}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  );
}
