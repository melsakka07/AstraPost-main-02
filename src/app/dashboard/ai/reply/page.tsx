"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Sparkles, Loader2, Copy, Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";

interface Reply {
  text: string;
  style: string;
}

interface ReplyResult {
  tweetText: string;
  tweetAuthor: string;
  replies: Reply[];
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

export default function ReplyGeneratorPage() {
  const router = useRouter();
  const { openWithContext } = useUpgradeModal();

  const [tweetUrl, setTweetUrl] = useState("");
  const [language, setLanguage] = useState("en");
  const [tone, setTone] = useState("casual");
  const [goal, setGoal] = useState("add");
  const [result, setResult] = useState<ReplyResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!tweetUrl.trim()) {
      toast.error("Please enter a tweet URL");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/ai/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweetUrl, language, tone, goal }),
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
        toast.error(err.error ?? "Failed to generate replies");
        return;
      }

      const data = await res.json() as ReplyResult;
      setResult(data);
    } catch {
      toast.error("Failed to generate replies. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyReply = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const sendToComposer = (text: string) => {
    const params = new URLSearchParams({ prefill: text });
    router.push(`/dashboard/compose?${params.toString()}`);
  };

  return (
    <DashboardPageWrapper
      icon={MessageCircle}
      title="Reply Suggester"
      description="Generate high-quality replies to any public tweet — grow through engagement."
    >
      {/* Input */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tweetUrl">Tweet URL</Label>
            <Input
              id="tweetUrl"
              placeholder="https://x.com/username/status/..."
              value={tweetUrl}
              onChange={(e) => setTweetUrl(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
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

            <div className="space-y-1.5">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="educational">Educational</SelectItem>
                  <SelectItem value="inspirational">Inspirational</SelectItem>
                  <SelectItem value="humorous">Humorous</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Goal</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Value</SelectItem>
                  <SelectItem value="agree">Agree & Amplify</SelectItem>
                  <SelectItem value="counter">Counter-Perspective</SelectItem>
                  <SelectItem value="funny">Be Funny</SelectItem>
                  <SelectItem value="question">Ask a Question</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isLoading || !tweetUrl.trim()}
            className="w-full"
          >
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />Generate Replies</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Original tweet preview */}
      {result && (
        <Card className="border-border/50 bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{result.tweetAuthor}</p>
            <p className="text-sm">{result.tweetText}</p>
          </CardContent>
        </Card>
      )}

      {/* Reply options */}
      {!result && !isLoading && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <MessageCircle className="h-7 w-7 text-primary" />
          </div>
          <p className="font-semibold">Paste a tweet URL to generate replies</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Works with any public tweet from x.com or twitter.com
          </p>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Fetching tweet and crafting replies...</p>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {result.replies.length} Reply Options
          </h3>
          {result.replies.map((reply, idx) => (
            <Card key={idx} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <Badge variant="outline" className="text-xs capitalize">{reply.style}</Badge>
                    <p className="text-sm leading-relaxed">{reply.text}</p>
                    <p className="text-xs text-muted-foreground">{reply.text.length} chars</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyReply(reply.text, idx)}
                    >
                      {copiedIdx === idx ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => sendToComposer(reply.text)}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardPageWrapper>
  );
}
