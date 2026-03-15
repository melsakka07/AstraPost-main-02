"use client";

import { useState } from "react";
import { ShoppingCart, Sparkles, Loader2, Copy, Check, ExternalLink, Package } from "lucide-react";
import { toast } from "sonner";
import { RecentAffiliateLinks } from "@/components/affiliate/recent-affiliate-links";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function AffiliatePage() {
  const { openWithContext } = useUpgradeModal();
  const [url, setUrl] = useState("");
  const [tag, setTag] = useState("");
  const [platform, setPlatform] = useState("amazon");
  const [result, setResult] = useState<{ tweet: string, hashtags: string[], productTitle?: string, affiliateUrl?: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!url) return;
    setIsGenerating(true);
    setResult(null);

    try {
      const res = await fetch("/api/ai/affiliate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, affiliateTag: tag, platform }),
      });

      if (!res.ok) {
        if (res.status === 402) {
          let payload: PlanLimitPayload | null = null;
          try {
            payload = (await res.json()) as PlanLimitPayload;
          } catch {
          }
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
      toast.error("Failed to generate affiliate tweet");
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
    toast.success("Copied to clipboard");
  };

  return (
    <DashboardPageWrapper
      icon={Package}
      title="Affiliate Generator"
      description="Turn product links into high-converting tweets."
    >
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Product Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="product-url">Product URL</Label>
              <Input
                id="product-url"
                placeholder="https://amazon.com/product..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Paste the product link you want to promote.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger id="platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amazon">Amazon</SelectItem>
                  <SelectItem value="noon">Noon</SelectItem>
                  <SelectItem value="aliexpress">AliExpress</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="affiliate-tag">Affiliate Tag (Optional)</Label>
              <Input
                id="affiliate-tag"
                placeholder={platform === "amazon" ? "your-tag-20" : "Coupon Code / ID"}
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Your affiliate tag will be added to the generated tweet.
              </p>
            </div>

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={isGenerating || !url}
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Tweet
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Generated Result</CardTitle>
            {result && (
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
            {result ? (
              <div className="space-y-4 h-full flex flex-col">
                {result.productTitle && (
                  <div className="text-sm font-medium text-muted-foreground border-b pb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Detected: {result.productTitle}
                  </div>
                )}
                <div className="flex-1 whitespace-pre-wrap break-words rounded-md bg-muted p-4 text-lg leading-relaxed border">
                  {result.tweet}
                  <div className="mt-3 text-primary">
                    {result.hashtags.join(" ")}
                  </div>
                </div>
                {result.affiliateUrl && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md border">
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{result.affiliateUrl}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center rounded-lg bg-gradient-to-b from-muted/50 to-muted/20 p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <ShoppingCart className="h-7 w-7 text-primary" />
                </div>
                <p className="font-medium text-foreground">Ready to generate</p>
                <p className="mt-1 text-sm text-muted-foreground max-w-[240px]">Enter a product URL and click generate to create an affiliate tweet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <RecentAffiliateLinks />
    </DashboardPageWrapper>
  );
}
