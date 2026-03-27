"use client";

import { useState, useEffect } from "react";
import { Hash, Loader2, Copy, Check, PenSquare, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { useSession } from "@/lib/auth-client";
import { sendToComposer } from "@/lib/composer-bridge";
import { LANGUAGES } from "@/lib/constants";

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

interface HashtagResult {
  hashtags: string[];
}

export function HashtagGenerator() {
  const { data: session } = useSession();
  const { openWithContext } = useUpgradeModal();
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState("ar");
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [allCopied, setAllCopied] = useState(false);

  // Sync AI language with user's preferred language once session loads
  useEffect(() => {
    if (session?.user && "language" in session.user) {
      setLanguage((session.user as any).language || "ar");
    }
  }, [session?.user]);

  const handleGenerate = async () => {
    if (!content.trim()) {
      toast.error("Please enter some content");
      return;
    }

    setIsGenerating(true);
    setGeneratedHashtags([]);

    try {
      const res = await fetch("/api/ai/hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          language
        }),
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
        throw new Error("Failed to generate hashtags");
      }

      const data = (await res.json()) as HashtagResult;
      setGeneratedHashtags(data.hashtags || []);
      toast.success(`Generated ${data.hashtags?.length || 0} hashtags!`);
    } catch (error) {
      console.error("Hashtag generation error:", error);
      toast.error("Failed to generate hashtags");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyHashtag = (hashtag: string, index: number) => {
    navigator.clipboard.writeText(hashtag);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success("Copied to clipboard");
  };

  const copyAllHashtags = () => {
    const allTags = generatedHashtags.join(" ");
    navigator.clipboard.writeText(allTags);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

  const removeHashtag = (index: number) => {
    setGeneratedHashtags((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Content Input */}
          <div className="space-y-2">
            <Label htmlFor="hashtag-content">Tweet Content</Label>
            <Textarea
              id="hashtag-content"
              placeholder="Paste your tweet content here to generate relevant hashtags..."
              className="min-h-[120px] resize-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {content.length} characters
            </p>
          </div>

          {/* Language Selector */}
          <div className="space-y-2">
            <Label htmlFor="hashtag-language">Target Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="hashtag-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Hashtags will be prioritized based on regional trends
            </p>
          </div>

          {/* Generate Button */}
          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={isGenerating || !content.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="me-2 h-4 w-4" />
                Generate Hashtags
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Card */}
      {generatedHashtags.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Generated Hashtags
              <Badge variant="secondary">{generatedHashtags.length}</Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyAllHashtags} aria-label="Copy all hashtags">
                {allCopied ? (
                  <><Check className="me-2 h-4 w-4" />Copied!</>
                ) : (
                  <><Copy className="me-2 h-4 w-4" />Copy All</>
                )}
              </Button>
              <Button size="sm" onClick={() => sendToComposer([generatedHashtags.join(" ")], { source: "hashtag-generator" })} aria-label="Send hashtags to Composer">
                <PenSquare className="me-2 h-4 w-4" />Compose
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {generatedHashtags.map((hashtag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="group relative cursor-pointer hover:bg-primary/20 transition-colors px-3 py-1.5 text-sm"
                  onClick={() => copyHashtag(hashtag, index)}
                >
                  {hashtag}
                  {copiedIndex === index && (
                    <Check className="ms-1 h-3 w-3 text-green-500" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeHashtag(index);
                    }}
                    className="ms-1 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Click any hashtag to copy it, or use "Copy All" to get everything. Click × to remove a hashtag.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
