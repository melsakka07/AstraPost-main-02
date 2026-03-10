"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Plus, X, Image as ImageIcon, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TargetAccountsSelect } from "@/components/composer/target-accounts-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { cn } from "@/lib/utils";

interface TweetDraft {
  id: string;
  content: string;
  media: Array<{
    url: string;
    mimeType: string;
    fileType: "image" | "video" | "gif";
    size: number;
  }>;
}

export function Composer() {
  const [tweets, setTweets] = useState<TweetDraft[]>([
    { id: "1", content: "", media: [] },
  ]);
  const previewTweet = tweets[0];
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetXAccountIds, setTargetXAccountIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTweetId, setActiveTweetId] = useState<string | null>(null);

  // AI State
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTool, setAiTool] = useState<"thread" | "hook" | "cta" | "rewrite" | "translate">("thread");
  const [aiTargetTweetId, setAiTargetTweetId] = useState<string | null>(null);
  const [aiTopic, setAiTopic] = useState("");
  const [aiTone, setAiTone] = useState("professional");
  const [aiCount, setAiCount] = useState([3]);
  const [aiLanguage, setAiLanguage] = useState("ar");
  const [aiRewriteText, setAiRewriteText] = useState("");
  const [aiAddNumbering, setAiAddNumbering] = useState(true);
  const [aiTranslateTarget, setAiTranslateTarget] = useState<"ar" | "en">("en");

  const { open: openUpgradeModal } = useUpgradeModal();

  const addTweet = () => {
    setTweets([
      ...tweets,
      { id: Math.random().toString(36).substr(2, 9), content: "", media: [] },
    ]);
  };

  const removeTweet = (id: string) => {
    if (tweets.length === 1) return;
    setTweets(tweets.filter((t) => t.id !== id));
  };

  const updateTweet = (id: string, content: string) => {
    setTweets(
      tweets.map((t) => (t.id === id ? { ...t, content } : t))
    );
  };

  const addTweetMedia = (id: string, items: TweetDraft["media"]) => {
    setTweets(
      tweets.map((t) => (t.id === id ? { ...t, media: [...t.media, ...items].slice(0, 4) } : t))
    );
  };

  const removeTweetMedia = (id: string, url: string) => {
    setTweets(tweets.map((t) => (t.id === id ? { ...t, media: t.media.filter((m) => m.url !== url) } : t)));
  };

  const applyNumbering = (drafts: TweetDraft[]) => {
    const total = drafts.length;
    return drafts.map((t, idx) => {
      const prefix = `${idx + 1}/${total} `;
      const cleaned = t.content.replace(/^\s*\d+\/\d+\s+/g, "");
      const maxLen = 280 - prefix.length;
      const next = cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
      return { ...t, content: `${prefix}${next}` };
    });
  };

  const openAiTool = (tool: "thread" | "hook" | "cta" | "rewrite" | "translate", tweetId?: string) => {
    setAiTool(tool);
    if (tool === "rewrite" && tweetId) {
      setAiTargetTweetId(tweetId);
      const t = tweets.find((x) => x.id === tweetId);
      setAiRewriteText(t?.content || "");
      setAiTranslateTarget(aiLanguage === "ar" ? "en" : "ar");
    } else {
      setAiTargetTweetId(null);
      setAiRewriteText("");
      setAiTranslateTarget(aiLanguage === "ar" ? "en" : "ar");
    }
    setIsAiOpen(true);
  };

  const handleAiRun = async () => {
    setIsGenerating(true);
    try {
      if (aiTool === "thread") {
        if (!aiTopic) throw new Error("Topic is required");
        const res = await fetch("/api/ai/thread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: aiTopic,
            tone: aiTone,
            tweetCount: aiCount[0],
            language: aiLanguage,
          }),
        });
        if (!res.ok) {
          if (res.status === 402) {
            openUpgradeModal();
            throw new Error("AI limit reached. Upgrade to continue.");
          }
          throw new Error("Generation failed");
        }
        const data = await res.json();
        let newTweets: TweetDraft[] = data.tweets.map((content: string) => ({
          id: Math.random().toString(36).substr(2, 9),
          content,
          media: [],
        }));
        if (aiAddNumbering) {
          newTweets = applyNumbering(newTweets);
        }
        setTweets(newTweets);
        setIsAiOpen(false);
        toast.success("Thread generated!");
        return;
      }

      if (aiTool === "hook") {
        const res = await fetch("/api/ai/tools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool: "hook",
            topic: aiTopic || tweets[0]?.content || "",
            tone: aiTone,
            language: aiLanguage,
          }),
        });
        if (!res.ok) {
          if (res.status === 402) {
            openUpgradeModal();
            throw new Error("AI limit reached. Upgrade to continue.");
          }
          throw new Error("Hook generation failed");
        }
        const data = await res.json();
        const first = tweets[0];
        if (!first) throw new Error("No tweet to update");
        updateTweet(first.id, data.text);
        setIsAiOpen(false);
        toast.success("Hook generated!");
        return;
      }

      if (aiTool === "cta") {
        const res = await fetch("/api/ai/tools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool: "cta",
            tone: aiTone,
            language: aiLanguage,
          }),
        });
        if (!res.ok) {
          if (res.status === 402) {
            openUpgradeModal();
            throw new Error("AI limit reached. Upgrade to continue.");
          }
          throw new Error("CTA generation failed");
        }
        const data = await res.json();
        const last = tweets[tweets.length - 1];
        if (!last) throw new Error("No tweet to update");
        updateTweet(last.id, `${last.content}\n\n${data.text}`.trim());
        setIsAiOpen(false);
        toast.success("CTA added!");
        return;
      }

      if (aiTool === "translate") {
        const res = await fetch("/api/ai/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tweets: tweets.map((t) => t.content),
            targetLanguage: aiTranslateTarget,
          }),
        });
        if (!res.ok) {
          if (res.status === 402) {
            openUpgradeModal();
            throw new Error("AI limit reached. Upgrade to continue.");
          }
          throw new Error("Translation failed");
        }
        const data = await res.json();
        const next = tweets.map((t, idx) => ({
          ...t,
          content: data.tweets?.[idx] ?? t.content,
        }));
        setTweets(next);
        setIsAiOpen(false);
        toast.success("Thread translated!");
        return;
      }

      const targetId = aiTargetTweetId;
      if (!targetId) throw new Error("No tweet selected");
      const res = await fetch("/api/ai/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "rewrite",
          input: aiRewriteText,
          tone: aiTone,
          language: aiLanguage,
        }),
      });
      if (!res.ok) {
        if (res.status === 402) {
          openUpgradeModal();
          throw new Error("AI limit reached. Upgrade to continue.");
        }
        throw new Error("Rewrite failed");
      }
      const data = await res.json();
      updateTweet(targetId, data.text);
      setIsAiOpen(false);
      toast.success("Tweet rewritten!");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "AI request failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !activeTweetId) return;

    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    try {
      const existingCount = tweets.find((t) => t.id === activeTweetId)?.media.length || 0;
      const remaining = Math.max(0, 4 - existingCount);
      const toUpload = files.slice(0, remaining);
      if (toUpload.length === 0) {
        toast.error("Max 4 media per tweet");
        return;
      }

      const uploaded: TweetDraft["media"] = [];
      for (const file of toUpload) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/media/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const msg = await res.text().catch(() => "Upload failed");
          throw new Error(msg || "Upload failed");
        }
        const data = await res.json();
        uploaded.push({
          url: data.url,
          mimeType: data.mimeType,
          fileType: data.fileType,
          size: data.size,
        });
      }

      addTweetMedia(activeTweetId, uploaded);
      toast.success("Media uploaded");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to upload media");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerFileUpload = (tweetId: string) => {
    setActiveTweetId(tweetId);
    fileInputRef.current?.click();
  };

  const handleSubmit = async (action: "draft" | "schedule" | "publish_now") => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tweets: tweets.map(t => ({
            content: t.content,
            media: t.media
          })),
          targetXAccountIds,
          scheduledAt: scheduledDate || undefined,
          action
        }),
      });

      if (!res.ok) {
        if (res.status === 402) {
             openUpgradeModal();
             throw new Error("Plan limit reached. Upgrade to continue.");
        }
        const error = await res.json();
        throw new Error(error.error || "Failed to submit");
      }

      const data = await res.json();
      const count = Array.isArray(data.postIds) ? data.postIds.length : 1;
      let message = count > 1 ? `Created ${count} posts.` : "Post drafted!";
      if (action === "schedule") message = count > 1 ? `Scheduled ${count} posts.` : "Post scheduled!";
      if (action === "publish_now") message = count > 1 ? `Queued ${count} posts.` : "Post published (queued)!";

      toast.success(message);
      setTweets([{ id: Math.random().toString(36).substr(2, 9), content: "", media: [] }]);
      setScheduledDate("");
    } catch (error) {
        console.error(error);
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCharCount = (text: string) => text.length;
  const isOverLimit = (text: string) => getCharCount(text) > 280;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*,video/*"
        multiple
        onChange={handleFileUpload}
      />

      {/* Editor Column */}
      <div className="lg:col-span-2 space-y-4">
        {tweets.map((tweet, index) => (
          <div key={tweet.id} className="relative group">
            <div className="absolute -left-8 top-4 text-muted-foreground font-mono text-sm">
              {index + 1}
            </div>
            
            <Card className={cn(
              "border-l-4",
              isOverLimit(tweet.content) ? "border-l-destructive" : "border-l-primary"
            )}>
              <CardContent className="pt-4">
                <Textarea
                  value={tweet.content}
                  onChange={(e) => updateTweet(tweet.id, e.target.value)}
                  placeholder="What's happening?"
                  className="min-h-[120px] resize-none border-none focus-visible:ring-0 text-lg p-0"
                />
                
                {/* Media Preview */}
                {tweet.media.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {tweet.media.map((m, i) => (
                      <div key={`${m.url}-${i}`} className="relative w-20 h-20 rounded-md overflow-hidden border">
                        {m.fileType === "video" ? (
                          <video src={m.url} className="w-full h-full object-cover" />
                        ) : (
                          <Image src={m.url} alt="Preview" fill className="object-cover" sizes="80px" />
                        )}
                        <button
                          type="button"
                          className="absolute top-1 right-1 rounded-sm bg-background/80 p-0.5 hover:bg-background"
                          onClick={() => removeTweetMedia(tweet.id, m.url)}
                          aria-label="Remove media"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="flex justify-between items-center border-t pt-3">
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-primary"
                    onClick={() => triggerFileUpload(tweet.id)}
                  >
                    <ImageIcon className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-primary"
                    onClick={() => openAiTool("rewrite", tweet.id)}
                    aria-label="Rewrite with AI"
                  >
                    <Sparkles className="h-5 w-5" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className={cn(
                    "text-sm font-medium",
                    isOverLimit(tweet.content) ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {getCharCount(tweet.content)} / 280
                  </span>
                  
                  {tweets.length > 1 && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => removeTweet(tweet.id)}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
            
            {/* Connector Line */}
            {index < tweets.length - 1 && (
              <div className="absolute left-[-1.9rem] top-[3rem] bottom-[-2rem] w-0.5 bg-border -z-10" />
            )}
          </div>
        ))}

        <Button 
          variant="outline" 
          className="w-full py-6 border-dashed"
          onClick={addTweet}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add to Thread
        </Button>
      </div>

      {/* Sidebar / Preview Column */}
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => openAiTool("thread")}>
                AI Thread
              </Button>
              <Button variant="outline" onClick={() => openAiTool("hook")}>
                Hook
              </Button>
              <Button variant="outline" onClick={() => openAiTool("cta")}>
                CTA
              </Button>
              <Button variant="outline" onClick={() => openAiTool("translate")}>
                Translate
              </Button>
              <Button variant="outline" onClick={() => setTweets(applyNumbering([...tweets]))}>
                Number 1/N
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Post to accounts</label>
              <TargetAccountsSelect value={targetXAccountIds} onChange={setTargetXAccountIds} />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Schedule for</label>
                <Input 
                    type="datetime-local" 
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                />
            </div>

            <div className="flex flex-col gap-2">
                <Button 
                    className="w-full size-lg text-lg" 
                    onClick={() => handleSubmit(scheduledDate ? "schedule" : "publish_now")}
                    disabled={isSubmitting}
                >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {scheduledDate ? "Schedule Post" : "Post Now"}
                </Button>

                <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => handleSubmit("draft")}
                    disabled={isSubmitting}
                >
                    Save as Draft
                </Button>
            </div>
          </CardContent>
        </Card>

        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase">Mobile Preview</h3>
          <div className="bg-background border rounded-md p-4 space-y-4">
             <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                <div className="space-y-1 w-full">
                   <div className="flex items-center gap-1 text-sm">
                      <span className="font-bold">User Name</span>
                      <span className="text-muted-foreground">@handle</span>
                   </div>
                   <p className="text-sm whitespace-pre-wrap">
                      {previewTweet?.content || "Preview text will appear here..."}
                   </p>
                   {(previewTweet?.media?.length || 0) > 0 && (
                       <div className="mt-2 rounded-lg overflow-hidden border">
                           {previewTweet?.media?.[0]?.fileType === "video" ? (
                             <video src={previewTweet?.media?.[0]?.url} className="w-full h-auto" controls />
                           ) : (
                             <Image src={previewTweet?.media?.[0]?.url || ""} alt="Preview" width={600} height={400} className="w-full h-auto" />
                           )}
                       </div>
                   )}
                </div>
             </div>
          </div>
        </div>
      </div>
      <Dialog open={isAiOpen} onOpenChange={setIsAiOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {aiTool === "thread"
                ? "AI Thread Writer"
                : aiTool === "hook"
                  ? "AI Hook Generator"
                  : aiTool === "cta"
                    ? "AI CTA Generator"
                    : aiTool === "translate"
                      ? "AI Translate Thread"
                    : "AI Rewrite"}
            </DialogTitle>
            <DialogDescription>
              {aiTool === "thread"
                ? "Generate a thread about any topic instantly."
                : aiTool === "hook"
                  ? "Generate a strong first tweet to start your thread."
                  : aiTool === "cta"
                    ? "Generate a short call-to-action to end your thread."
                    : aiTool === "translate"
                      ? "Translate the entire thread while keeping tweet limits."
                    : "Rewrite a tweet in a new tone."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {(aiTool === "thread" || aiTool === "hook") && (
              <div className="space-y-2">
                <Label>Topic</Label>
                <Input
                  placeholder="e.g. Productivity tips for developers"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                />
              </div>
            )}

            {aiTool === "rewrite" && (
              <div className="space-y-2">
                <Label>Tweet</Label>
                <Textarea
                  value={aiRewriteText}
                  onChange={(e) => setAiRewriteText(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
            )}

            {aiTool === "translate" && (
              <div className="space-y-2">
                <Label>Target Language</Label>
                <Select value={aiTranslateTarget} onValueChange={(v) => setAiTranslateTarget(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">Arabic</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={aiTone} onValueChange={setAiTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="funny">Funny</SelectItem>
                    <SelectItem value="educational">Educational</SelectItem>
                    <SelectItem value="inspirational">Inspirational</SelectItem>
                    <SelectItem value="viral">Viral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={aiLanguage} onValueChange={setAiLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">Arabic</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {aiTool === "thread" && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Length (Tweets)</Label>
                    <span className="text-sm text-muted-foreground">{aiCount[0]}</span>
                  </div>
                  <Slider
                    value={aiCount}
                    onValueChange={setAiCount}
                    min={3}
                    max={10}
                    step={1}
                  />
                </div>

                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm">Add numbering (1/N)</span>
                  <Button
                    type="button"
                    variant={aiAddNumbering ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAiAddNumbering((v) => !v)}
                  >
                    {aiAddNumbering ? "On" : "Off"}
                  </Button>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAiOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAiRun}
              disabled={
                isGenerating ||
                (aiTool === "thread" && !aiTopic) ||
                (aiTool === "hook" && !aiTopic && !(tweets[0]?.content || "").trim()) ||
                (aiTool === "rewrite" && !aiRewriteText.trim())
              }
            >
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
