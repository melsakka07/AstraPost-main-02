"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AiResultActions, AiResultItemActions } from "@/components/ai/shared/ai-result-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { parsePlanLimitResponse } from "@/lib/types/plan-limit";

interface BioVariant {
  text: string;
  goal: string;
  rationale: string;
}

export function BioGeneratorClient({ connectedUsername }: { connectedUsername: string }) {
  const t = useTranslations("ai_bio");
  const tCommon = useTranslations("common");
  const langT = useTranslations("languages");
  const router = useRouter();
  const { openWithContext } = useUpgradeModal();

  const [currentBio, setCurrentBio] = useState("");
  const [niche, setNiche] = useState("");
  const [goal, setGoal] = useState("general");
  const [language, setLanguage] = useState("en");
  const [variants, setVariants] = useState<BioVariant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const elapsed = useElapsedTime(isLoading);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setVariants([]);

    try {
      const res = await fetch("/api/ai/bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentBio, goal, language, niche }),
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
        toast.error(err.error ?? t("error"));
        return;
      }

      const data = (await res.json()) as { variants: BioVariant[] };
      setVariants(data.variants);
    } catch {
      toast.error(t("error"));
    } finally {
      setIsLoading(false);
    }
  };

  const copyBio = async (text: string, idx: number) => {
    const ok = await copyToClipboard(text);
    if (!ok) {
      toast.error(tCommon("copy_failed"));
      return;
    }
    setCopiedIdx(idx);
    toast.success(t("toasts.copied"));
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const sendToComposer = (text: string) => {
    const params = new URLSearchParams({ prefill: text });
    router.push(`/dashboard/compose?${params.toString()}`);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
      {/* Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("configure")}</CardTitle>
          {connectedUsername && (
            <CardDescription>{t("connected_as", { username: connectedUsername })}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="currentBio">{t("current_bio_label")}</Label>
            <div className="relative">
              <Textarea
                id="currentBio"
                placeholder={t("current_bio_placeholder")}
                className="resize-none pb-6"
                rows={3}
                value={currentBio}
                onChange={(e) => setCurrentBio(e.target.value)}
                maxLength={500}
              />
              <span
                className={`pointer-events-none absolute end-2 bottom-2 text-xs tabular-nums select-none ${
                  currentBio.length > 160
                    ? "text-destructive"
                    : currentBio.length >= 130
                      ? "text-warning-11"
                      : "text-muted-foreground"
                }`}
              >
                {currentBio.length}/160
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="niche">{t("your_niche")}</Label>
            <Input
              id="niche"
              placeholder={t("niche_placeholder")}
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="space-y-2">
              <Label>{t("optimization_goal")}</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">{t("general")}</SelectItem>
                  <SelectItem value="gain_followers">{t("gain_followers")}</SelectItem>
                  <SelectItem value="attract_clients">{t("attract_clients")}</SelectItem>
                  <SelectItem value="build_authority">{t("build_authority")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("language")}</Label>
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

          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={isLoading || !niche.trim()}
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t("generating")} ({elapsed}s)
              </>
            ) : (
              <>
                <Sparkles className="me-2 h-4 w-4" />
                {t("generate_variants")}
              </>
            )}
          </Button>
          {!isLoading && !niche.trim() && (
            <p className="text-muted-foreground text-center text-xs">{t("niche_required_hint")}</p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-3">
        {variants.length === 0 && !isLoading && (
          <div className="border-border bg-muted/20 space-y-3 rounded-xl border border-dashed p-5">
            {/* Blurred bio card previews */}
            <div
              className="pointer-events-none space-y-2 opacity-25 blur-[1px] select-none"
              aria-hidden="true"
            >
              {[
                [t("gain_followers"), "w-full", "w-4/5"],
                [t("attract_clients"), "w-3/4", "w-full"],
                [t("build_authority"), "w-full", "w-2/3"],
              ].map(([goal, w1, w2]) => (
                <div key={goal} className="bg-card space-y-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="bg-muted-foreground/20 h-4 w-20 rounded-full" />
                    <div className="bg-muted-foreground/10 h-6 w-12 rounded" />
                  </div>
                  <div className={`bg-muted-foreground/20 h-2.5 rounded ${w1}`} />
                  <div className={`bg-muted-foreground/20 h-2.5 rounded ${w2}`} />
                  <div className="bg-muted-foreground/10 h-2 w-1/4 rounded" />
                </div>
              ))}
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">{t("variants_appear")}</p>
              <p className="text-muted-foreground mt-1 text-xs">{t("variants_description")}</p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="border-border bg-muted/20 flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-16">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
            <p className="text-muted-foreground text-sm">{t("crafting")}</p>
          </div>
        )}

        {variants.length > 0 && (
          <AiResultActions
            itemCount={variants.length}
            onRegenerate={handleGenerate}
            onSendToComposer={() => {
              const allText = variants.map((v) => v.text).join("\n\n---\n\n");
              sendToComposer(allText);
            }}
          />
        )}

        {variants.map((v, idx) => (
          <Card key={idx} className="hover:border-primary/30 transition-colors">
            <CardContent className="space-y-2 p-4">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                <Badge variant="secondary" className="text-xs">
                  {v.goal}
                </Badge>
                <AiResultItemActions
                  text={v.text}
                  index={idx}
                  onCopy={copyBio}
                  copied={copiedIdx === idx}
                  onSendToComposer={(text) => sendToComposer(text)}
                />
              </div>
              <p className="text-sm leading-relaxed font-medium">{v.text}</p>
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`text-xs tabular-nums ${v.text.length > 160 ? "text-destructive" : "text-success-11"}`}
                >
                  {v.text.length > 160
                    ? t("chars_over_limit", { count: v.text.length })
                    : `${v.text.length}/160`}
                </p>
                <a
                  href="https://x.com/settings/profile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground inline-flex min-h-[44px] items-center gap-1 p-2 text-xs transition-colors"
                  aria-label={t("open_x_settings")}
                >
                  <ExternalLink className="h-3 w-3" />
                  {t("open_x_settings")}
                </a>
              </div>
              <p className="text-muted-foreground text-xs italic">{v.rationale}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
