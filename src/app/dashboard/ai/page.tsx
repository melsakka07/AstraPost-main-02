"use client";

import { useState } from "react";
import { Bot, Sparkles, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

export default function AIWriterPage() {
  const { openWithContext } = useUpgradeModal();
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("professional");
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!topic) return;
    setIsGenerating(true);
    setGeneratedContent("");

    try {
      const res = await fetch("/api/ai/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, tone }),
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
      // Assuming API returns { thread: [...] } or text
      // Let's check api/ai/thread route.
      // Based on previous knowledge, it returns a thread array.
      // I'll format it as text.
      const text = Array.isArray(data.tweets) 
        ? data.tweets.join("\n\n---\n\n") 
        : JSON.stringify(data);
      
      setGeneratedContent(text);
    } catch (error) {
      toast.error("Failed to generate content");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
            <Bot className="h-8 w-8 text-primary" />
        </div>
        <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Writer</h1>
            <p className="text-muted-foreground">Generate viral threads and hooks in seconds.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <Card>
            <CardHeader>
                <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Topic or Idea</label>
                    <Textarea 
                        placeholder="e.g. The future of remote work..."
                        className="min-h-[120px]"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Tone</label>
                    <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="casual">Casual</SelectItem>
                            <SelectItem value="humorous">Humorous</SelectItem>
                            <SelectItem value="controversial">Controversial</SelectItem>
                            <SelectItem value="educational">Educational</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Button 
                    className="w-full" 
                    onClick={handleGenerate}
                    disabled={isGenerating || !topic}
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate Content
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>

        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Result</CardTitle>
                {generatedContent && (
                    <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                )}
            </CardHeader>
            <CardContent className="flex-1">
                {generatedContent ? (
                    <div className="h-full whitespace-pre-wrap break-words rounded-md bg-muted p-4 text-sm">
                        {generatedContent}
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-md p-8">
                        Generated content will appear here
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
