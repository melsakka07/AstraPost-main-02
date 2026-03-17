"use client";

import { useEffect, useState } from "react";
import { UserPen, Sparkles, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";

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
            payload = await res.json() as PlanLimitPayload;
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
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Failed to generate bio variants");
        return;
      }

      const data = await res.json() as { variants: BioVariant[] };
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
    toast.success("Bio copied to clipboard");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <DashboardPageWrapper
      icon={UserPen}
      title="AI Bio Optimizer"
      description="Generate compelling X bio variants optimized for your goals — under 160 characters."
    >
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
              <Textarea
                id="currentBio"
                placeholder="Paste your current X bio here, or leave blank..."
                className="resize-none"
                rows={3}
                value={currentBio}
                onChange={(e) => setCurrentBio(e.target.value)}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{currentBio.length}/500</p>
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

            <div className="grid grid-cols-2 gap-4">
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
                    <SelectItem value="tr">Turkish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" />Generate 3 Bio Variants</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-3">
          {variants.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-16 text-center h-full">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <UserPen className="h-7 w-7 text-primary" />
              </div>
              <p className="font-semibold">3 bio variants will appear here</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Each variant targets a different goal or tone.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-16 gap-3 h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Crafting optimized bios...</p>
            </div>
          )}

          {variants.map((v, idx) => (
            <Card key={idx} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">{v.goal}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyBio(v.text, idx)}
                  >
                    {copiedIdx === idx ? (
                      <><Check className="h-3.5 w-3.5 mr-1" />Copied</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5 mr-1" />Copy</>
                    )}
                  </Button>
                </div>
                <p className="text-sm font-medium leading-relaxed">{v.text}</p>
                <p className="text-xs text-muted-foreground">{v.text.length}/160 chars</p>
                <p className="text-xs text-muted-foreground italic">{v.rationale}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardPageWrapper>
  );
}
