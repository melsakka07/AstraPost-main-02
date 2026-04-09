"use client";

import { useEffect, useState } from "react";
import { UserPen, Sparkles, Loader2, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
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

interface BioVariant {
  text: string;
  goal: string;
  rationale: string;
}

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

export default function BioOptimizerPage() {
  const { openWithContext } = useUpgradeModal();

  const [currentBio, setCurrentBio] = useState("");
  const [niche, setNiche] = useState("");
  const [goal, setGoal] = useState("general");
  const [language, setLanguage] = useState("en");
  const [variants, setVariants] = useState<BioVariant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const elapsed = useElapsedTime(isLoading);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [connectedUsername, setConnectedUsername] = useState("");

  // Fetch connected username on mount
  useEffect(() => {
    fetch("/api/ai/bio")
      .then((r) => r.json())
      .then((d: { username?: string }) => {
        if (d.username) setConnectedUsername(d.username);
      })
      .catch(() => {});
  }, []);

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
        toast.error(err.error ?? "Failed to generate bio variants");
        return;
      }

      const data = (await res.json()) as { variants: BioVariant[] };
      setVariants(data.variants);
    } catch {
      toast.error("Failed to generate bio variants. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyBio = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <DashboardPageWrapper
      icon={UserPen}
      title="AI Bio Optimizer"
      description="Enter your niche to generate 3 compelling X bio variants under 160 characters — optimized for your goal."
    >
      <Breadcrumb items={[{ label: "Bio Optimizer" }]} className="mb-2" />
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        {/* Config */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configure</CardTitle>
            {connectedUsername && (
              <CardDescription>Connected as @{connectedUsername}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="currentBio">Current Bio (optional)</Label>
              <div className="relative">
                <Textarea
                  id="currentBio"
                  placeholder="Paste your current X bio here, or leave blank..."
                  className="resize-none pb-6"
                  rows={3}
                  value={currentBio}
                  onChange={(e) => setCurrentBio(e.target.value)}
                  maxLength={500}
                />
                <span
                  className={`pointer-events-none absolute right-2 bottom-2 text-xs tabular-nums select-none ${
                    currentBio.length > 160
                      ? "text-destructive"
                      : currentBio.length >= 130
                        ? "text-amber-500"
                        : "text-muted-foreground"
                  }`}
                >
                  {currentBio.length}/160
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="niche">Your Niche</Label>
              <Input
                id="niche"
                placeholder="e.g. Islamic finance, AI tools, fitness..."
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-2">
                <Label>Optimization Goal</Label>
                <Select value={goal} onValueChange={setGoal}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="gain_followers">Gain Followers</SelectItem>
                    <SelectItem value="attract_clients">Attract Clients</SelectItem>
                    <SelectItem value="build_authority">Build Authority</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
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

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={isLoading || !niche.trim()}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  Generating... ({elapsed}s)
                </>
              ) : (
                <>
                  <Sparkles className="me-2 h-4 w-4" />
                  Generate 3 Bio Variants
                </>
              )}
            </Button>
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
                  ["Gain Followers", "w-full", "w-4/5"],
                  ["Attract Clients", "w-3/4", "w-full"],
                  ["Build Authority", "w-full", "w-2/3"],
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
                <p className="text-sm font-semibold">3 bio variants will appear here</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Each targets a different goal — followers, clients, or authority
                </p>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="border-border bg-muted/20 flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-16">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
              <p className="text-muted-foreground text-sm">Crafting optimized bios...</p>
            </div>
          )}

          {variants.map((v, idx) => (
            <Card key={idx} className="hover:border-primary/30 transition-colors">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {v.goal}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={() => copyBio(v.text, idx)}>
                    {copiedIdx === idx ? (
                      <>
                        <Check className="me-1 h-3.5 w-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="me-1 h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm leading-relaxed font-medium">{v.text}</p>
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-xs tabular-nums ${v.text.length > 160 ? "text-destructive" : "text-emerald-500"}`}
                  >
                    {v.text.length}/160 chars{v.text.length > 160 && " — over limit"}
                  </p>
                  <a
                    href="https://x.com/settings/profile"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open X Settings
                  </a>
                </div>
                <p className="text-muted-foreground text-xs italic">{v.rationale}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
