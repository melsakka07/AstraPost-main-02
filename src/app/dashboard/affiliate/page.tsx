"use client";

import { useState } from "react";
import { ShoppingCart, Sparkles, Loader2, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function AffiliatePage() {
  const [url, setUrl] = useState("");
  const [tag, setTag] = useState("");
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
        body: JSON.stringify({ url, affiliateTag: tag }),
      });

      if (!res.ok) throw new Error("Failed to generate");

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
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
            <ShoppingCart className="h-8 w-8 text-primary" />
        </div>
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Affiliate Generator</h1>
            <p className="text-muted-foreground">Turn product links into high-converting tweets.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <Card>
            <CardHeader>
                <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Product URL</label>
                    <Input 
                        placeholder="https://amazon.com/..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Affiliate Tag (Optional)</label>
                    <Input 
                        placeholder="tag-20"
                        value={tag}
                        onChange={(e) => setTag(e.target.value)}
                    />
                </div>

                <Button 
                    className="w-full" 
                    onClick={handleGenerate}
                    disabled={isGenerating || !url}
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
                <CardTitle>Result</CardTitle>
                {result && (
                    <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                )}
            </CardHeader>
            <CardContent className="flex-1">
                {result ? (
                    <div className="space-y-4">
                        {result.productTitle && (
                            <div className="text-sm font-semibold text-muted-foreground border-b pb-2">
                                Detected: {result.productTitle}
                            </div>
                        )}
                        <div className="whitespace-pre-wrap break-words rounded-md bg-muted p-4 text-lg">
                            {result.tweet}
                            <div className="mt-2 text-primary">
                                {result.hashtags.join(" ")}
                            </div>
                        </div>
                        {result.affiliateUrl && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                <ExternalLink className="h-3 w-3" />
                                <span className="truncate">{result.affiliateUrl}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-md p-8">
                        Generated tweet will appear here
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
