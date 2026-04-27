"use client";

import { useState, useEffect } from "react";
import {
  ShoppingCart,
  Sparkles,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  Package,
  PenSquare,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { RecentAffiliateLinks } from "@/components/affiliate/recent-affiliate-links";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
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
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { useElapsedTime } from "@/hooks/use-elapsed-time";
import { useSession } from "@/lib/auth-client";
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

export default function AffiliatePage() {
  const t = useTranslations("affiliate");
  const { data: session } = useSession();
  const { openWithContext } = useUpgradeModal();
  const [url, setUrl] = useState("");
  const [tag, setTag] = useState("");
  const [platform, setPlatform] = useState("amazon");
  const [language, setLanguage] = useState("ar");
  const [result, setResult] = useState<{
    tweet: string;
    hashtags: string[];
    productTitle?: string;
    affiliateUrl?: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const elapsed = useElapsedTime(isGenerating);

  // Sync AI language with user's preferred language once session loads
  useEffect(() => {
    if (session?.user && "language" in session.user) {
      setLanguage((session.user as any).language || "ar");
    }
  }, [session?.user]);

  const handleGenerate = async () => {
    if (!url) return;
    setIsGenerating(true);
    setResult(null);

    try {
      const res = await fetch("/api/ai/affiliate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, affiliateTag: tag, platform, language }),
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
      setResult(data);
    } catch (error) {
      toast.error(t("toasts.generation_failed"));
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    const text = `${result.tweet}\n\n${result.hashtags.join(" ")}\n\n${result.affiliateUrl}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(t("toasts.copied"));
  };

  return (
    <DashboardPageWrapper icon={Package} title={t("title")} description={t("description")}>
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="text-primary h-5 w-5" />
              {t("product_details")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="product-url">{t("product_url_label")}</Label>
              <Input
                id="product-url"
                placeholder={t("product_url_placeholder")}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">{t("product_url_help")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform">{t("platform_label")}</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger id="platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amazon">{t("platforms.amazon")}</SelectItem>
                  <SelectItem value="noon">{t("platforms.noon")}</SelectItem>
                  <SelectItem value="aliexpress">{t("platforms.aliexpress")}</SelectItem>
                  <SelectItem value="other">{t("platforms.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("language_label")}</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">{t("languages.ar")}</SelectItem>
                  <SelectItem value="en">{t("languages.en")}</SelectItem>
                  <SelectItem value="fr">{t("languages.fr")}</SelectItem>
                  <SelectItem value="de">{t("languages.de")}</SelectItem>
                  <SelectItem value="es">{t("languages.es")}</SelectItem>
                  <SelectItem value="tr">{t("languages.tr")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="affiliate-tag">{t("tag_label")}</Label>
              <Input
                id="affiliate-tag"
                placeholder={
                  platform === "amazon" ? t("tag_placeholder_amazon") : t("tag_placeholder_other")
                }
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">{t("tag_help")}</p>
            </div>

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={isGenerating || !url}
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t("generating", { elapsed })}
                </>
              ) : (
                <>
                  <Sparkles className="me-2 h-4 w-4" />
                  {t("generate_tweet")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("generated_result")}</CardTitle>
            {result && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  aria-label={t("copy_aria_label")}
                >
                  {copied ? (
                    <>
                      <Check className="me-2 h-4 w-4" />
                      {t("copied_button")}
                    </>
                  ) : (
                    <>
                      <Copy className="me-2 h-4 w-4" />
                      {t("copy_button")}
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const text = `${result.tweet}\n\n${result.hashtags.join(" ")}${result.affiliateUrl ? `\n\n${result.affiliateUrl}` : ""}`;
                    sendToComposer([text], { source: "affiliate" });
                  }}
                >
                  <PenSquare className="me-2 h-4 w-4" />
                  {t("compose_button")}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1">
            {result ? (
              <div className="flex h-full flex-col space-y-4">
                {result.productTitle && (
                  <div className="text-muted-foreground flex items-center gap-2 border-b pb-2 text-sm font-medium">
                    <Package className="h-4 w-4" />
                    {t("detected_prefix")} {result.productTitle}
                  </div>
                )}
                <div className="bg-muted flex-1 rounded-md border p-4 text-lg leading-relaxed break-words whitespace-pre-wrap">
                  {result.tweet}
                  <div className="text-primary mt-3">{result.hashtags.join(" ")}</div>
                </div>
                {result.affiliateUrl && (
                  <div className="text-muted-foreground bg-muted/50 flex items-center gap-2 rounded-md border p-2 text-xs">
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{result.affiliateUrl}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="from-muted/50 to-muted/20 flex h-full flex-col space-y-4 rounded-lg bg-gradient-to-b p-5">
                {/* Blurred tweet preview */}
                <div
                  className="pointer-events-none flex-1 space-y-2 opacity-25 blur-[1.5px] select-none"
                  aria-hidden="true"
                >
                  <div className="bg-card space-y-1.5 rounded-lg border p-3">
                    <div className="flex items-center gap-1.5">
                      <div className="bg-muted-foreground/30 h-5 w-5 rounded-full" />
                      <div className="bg-muted-foreground/20 h-2.5 w-20 rounded" />
                    </div>
                    <div className="bg-muted-foreground/25 h-2.5 w-full rounded" />
                    <div className="bg-muted-foreground/25 h-2.5 w-4/5 rounded" />
                    <div className="bg-muted-foreground/20 h-2.5 w-3/5 rounded" />
                    <div className="mt-2 flex flex-wrap gap-1">
                      {["#AmazonFinds", "#Deal", "#MustHave"].map((tag) => (
                        <span
                          key={tag}
                          className="bg-primary/20 h-4 rounded-full px-1.5 text-[10px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-muted/50 text-muted-foreground flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <div className="bg-muted-foreground/20 h-2 w-3/4 rounded" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{t("empty_title")}</p>
                  <p className="text-muted-foreground mt-1 text-xs">{t("empty_description")}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <RecentAffiliateLinks />
    </DashboardPageWrapper>
  );
}
