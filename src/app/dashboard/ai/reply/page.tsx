"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Sparkles, Loader2, Copy, Check, ChevronRight, Eye } from "lucide-react";
import { toast } from "sonner";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { useElapsedTime } from "@/hooks/use-elapsed-time";

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
  const elapsed = useElapsedTime(isLoading);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Tweet preview state
  const [preview, setPreview] = useState<{ text: string; author: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewedUrl, setPreviewedUrl] = useState("");

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

  const handleUrlChange = (value: string) => {
    setTweetUrl(value);
    // Clear preview when the URL changes away from the last previewed URL
    if (value !== previewedUrl) {
      setPreview(null);
      setPreviewError(null);
    }
  };

  const handlePreview = async () => {
    if (!tweetUrl.trim()) return;
    setPreviewLoading(true);
    setPreviewError(null);
    setPreview(null);
    try {
      const res = await fetch("/api/x/tweet-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweetUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setPreviewError(err.error ?? "Could not fetch tweet. Check the URL and try again.");
        return;
      }
      const data = await res.json() as {
        success: boolean;
        data: { originalTweet: { text: string; author: { username: string; name: string } } };
      };
      setPreview({
        text: data.data.originalTweet.text,
        author: `@${data.data.originalTweet.author.username}`,
      });
      setPreviewedUrl(tweetUrl);
    } catch {
      setPreviewError("Failed to preview tweet. Please try again.");
    } finally {
      setPreviewLoading(false);
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
      description="Paste a tweet URL to generate 5 engagement-ready replies — grow your account through smart interactions."
    >
      <Breadcrumb items={[{ label: "Reply Suggester" }]} className="mb-2" />
      {/* Input */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tweetUrl">Tweet URL</Label>
            <div className="flex gap-2">
              <Input
                id="tweetUrl"
                placeholder="https://x.com/username/status/..."
                value={tweetUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handlePreview}
                disabled={!tweetUrl.trim() || previewLoading}
                aria-label="Preview tweet"
                title="Preview tweet before generating"
              >
                {previewLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {previewError && (
              <p className="text-xs text-destructive">{previewError}</p>
            )}
          </div>

          {/* Tweet preview card — shown after successful preview fetch */}
          {preview && (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{preview.author}</p>
              <p className="text-sm leading-relaxed">{preview.text}</p>
            </div>
          )}

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
              <><Loader2 className="me-2 h-4 w-4 animate-spin" />Generating... ({elapsed}s)</>
            ) : (
              <><Sparkles className="me-2 h-4 w-4" />Generate Replies</>
            )}
          </Button>
          {!preview && tweetUrl.trim() && !isLoading && (
            <p className="text-center text-xs text-muted-foreground">
              Tip: click <Eye className="inline h-3 w-3 mx-0.5 align-[-1px]" /> to preview the tweet before generating
            </p>
          )}
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
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 space-y-4">
          {/* Blurred conversation preview */}
          <div className="space-y-2 opacity-25 pointer-events-none select-none blur-[1.5px]" aria-hidden="true">
            {/* Original tweet bubble */}
            <div className="flex gap-2 items-start">
              <div className="h-7 w-7 rounded-full bg-muted-foreground/30 shrink-0" />
              <div className="rounded-2xl rounded-tl-none bg-muted border px-3 py-2 space-y-1 max-w-[280px]">
                <div className="h-2.5 bg-muted-foreground/30 rounded w-full" />
                <div className="h-2.5 bg-muted-foreground/30 rounded w-4/5" />
              </div>
            </div>
            {/* Reply bubbles */}
            {[["w-4/5", "w-3/5"], ["w-full", "w-2/3"], ["w-3/4", "w-full"]].map(([w1, w2], i) => (
              <div key={i} className="flex gap-2 items-start justify-end">
                <div className="rounded-2xl rounded-tr-none bg-primary/10 border border-primary/20 px-3 py-2 space-y-1 max-w-[240px]">
                  <div className={`h-2.5 bg-primary/30 rounded ${w1}`} />
                  <div className={`h-2.5 bg-primary/20 rounded ${w2}`} />
                </div>
                <div className="h-7 w-7 rounded-full bg-primary/20 shrink-0" />
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm">3 reply suggestions will appear here</p>
            <p className="mt-1 text-xs text-muted-foreground">Works with any public tweet from x.com or twitter.com</p>
          </div>
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
                    <p className={`text-xs tabular-nums ${reply.text.length > 280 ? "text-destructive" : reply.text.length >= 200 ? "text-amber-500" : "text-emerald-500"}`}>
                      {reply.text.length}/280
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyReply(reply.text, idx)}
                      aria-label="Copy reply"
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
                      aria-label="Send reply to Composer"
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
