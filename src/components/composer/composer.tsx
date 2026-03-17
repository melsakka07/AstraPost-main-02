
"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  ChevronDown,
  FileText,
  Globe,
  Hash,
  Info,
  ListOrdered,
  Loader2,
  Megaphone,
  Plus,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AiImageDialog } from "@/components/composer/ai-image-dialog";
import { BestTimeSuggestions } from "@/components/composer/best-time-suggestions";
import { InspirationPanel } from "@/components/composer/inspiration-panel";
import { SortableTweet } from "@/components/composer/sortable-tweet";
import { TargetAccountsSelect, SocialAccountLite } from "@/components/composer/target-accounts-select";
import { TemplatesDialog } from "@/components/composer/templates-dialog";
import { ViralScoreBadge } from "@/components/composer/viral-score-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSession } from "@/lib/auth-client";
import { LANGUAGES } from "@/lib/constants";
import { createUserTemplate } from "@/lib/templates";

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  images?: string[];
  siteName?: string;
}

interface TweetDraft {
  id: string;
  content: string;
  media: Array<{
    url: string;
    mimeType: string;
    fileType: "image" | "video" | "gif";
    size: number;
  }>;
  linkPreview?: LinkPreview | null;
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

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  const value = `${String(h).padStart(2, "0")}:${m}`;
  const period = h < 12 ? "AM" : "PM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { value, label: `${displayH}:${m} ${period}` };
});

export function Composer() {
  const [tweets, setTweets] = useState<TweetDraft[]>([
    { id: "1", content: "", media: [] },
  ]);
  const previewTweet = tweets[0];
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [browserTimezone, setBrowserTimezone] = useState<string | null>(null);
  const [recurrencePattern, setRecurrencePattern] = useState<string>("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetAccountIds, setTargetAccountIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTweetId, setActiveTweetId] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<SocialAccountLite[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const draftId = searchParams?.get("draft");
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  // Used to restore the draft's linked account once accounts have loaded
  const [draftXAccountId, setDraftXAccountId] = useState<string | null>(null);

  // AI State
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTool, setAiTool] = useState<"thread" | "hook" | "cta" | "rewrite" | "translate" | "hashtags">("thread");
  const [aiTargetTweetId, setAiTargetTweetId] = useState<string | null>(null);
  const [aiTopic, setAiTopic] = useState("");
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([]);
  const [aiTone, setAiTone] = useState("professional");
  const [aiCount, setAiCount] = useState([3]);
  const [aiLanguage, setAiLanguage] = useState("ar");
  const [aiRewriteText, setAiRewriteText] = useState("");
  const [aiAddNumbering, setAiAddNumbering] = useState(true);
  const [aiTranslateTarget, setAiTranslateTarget] = useState<string>("en");
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateCategory, setTemplateCategory] = useState("Personal");

  // AI Image Dialog State
  const [isAiImageOpen, setIsAiImageOpen] = useState(false);
  const [aiImageTargetTweetId, setAiImageTargetTweetId] = useState<string | null>(null);
  const [userPlanLimits, setUserPlanLimits] = useState<{
    availableModels: ("nano-banana-2" | "nano-banana-pro")[];
    preferredModel: "nano-banana-2" | "nano-banana-pro";
    remainingQuota: number;
  }>({
    availableModels: ["nano-banana-2"],
    preferredModel: "nano-banana-2",
    // Start at 0 — updated from server once session is available.
    // Avoids showing a stale hard-coded value before the API responds.
    remainingQuota: 0,
  });

  const { openWithContext: openUpgradeModal } = useUpgradeModal();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setAccountsLoading(true);
        const res = await fetch("/api/accounts", { method: "GET" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const list = (data.accounts || []) as SocialAccountLite[];
        setAccounts(list);
        
        if (targetAccountIds.length === 0) {
            const defaults = list.filter((a) => a.isDefault).map((a) => a.id);
            setTargetAccountIds(defaults.length > 0 ? defaults : list.slice(0, 1).map((a) => a.id));
        }
      } finally {
        if (!cancelled) setAccountsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch server-authoritative AI image plan limits.
  // The server is the single source of truth for available models and quota —
  // this removes the client-side getLimitsForPlan that diverged from plan-limits.ts.
  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ai/image/quota");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setUserPlanLimits({
          availableModels: data.availableModels ?? ["nano-banana-2"],
          preferredModel: data.preferredModel ?? "nano-banana-2",
          remainingQuota: data.remainingImages ?? 0,
        });
      } catch (e) {
        console.error("Failed to fetch AI image quota:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect browser timezone once after mount (SSR-safe — avoids hydration mismatch)
  useEffect(() => {
    setBrowserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  // Auto-save
  useEffect(() => {
    if (draftId) return; // Draft will be loaded from API — skip localStorage restore
    const saved = localStorage.getItem("astra-post-drafts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Only restore if we are at default state or empty
          if (tweets.length === 1 && tweets[0]?.content === "" && tweets[0]?.media.length === 0) {
             setTweets(parsed);
             toast.success("Draft restored from auto-save");
          }
        }
      } catch (e) {
        console.error("Failed to load drafts", e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem("astra-post-drafts", JSON.stringify(tweets));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [tweets]);

  // Load draft from database when ?draft=<id> is present in the URL
  useEffect(() => {
    if (!draftId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/posts/${draftId}`);
        if (!res.ok || cancelled) return;
        const post = await res.json();
        if (cancelled) return;

        const loadedTweets: TweetDraft[] = (post.tweets || []).map(
          (t: { content?: string; media?: Array<{ fileUrl: string; fileType: "image" | "video" | "gif"; fileSize?: number }> }) => ({
            id: Math.random().toString(36).substr(2, 9),
            content: t.content || "",
            media: (t.media || []).map((m) => ({
              url: m.fileUrl,
              mimeType: m.fileType === "image" ? "image/jpeg" : m.fileType === "video" ? "video/mp4" : "image/gif",
              fileType: m.fileType,
              size: m.fileSize || 0,
            })),
          })
        );

        if (loadedTweets.length > 0) {
          setTweets(loadedTweets);
          setEditingDraftId(draftId);
          if (post.xAccountId) setDraftXAccountId(post.xAccountId);
          if (post.scheduledAt) {
            setScheduledDate(new Date(post.scheduledAt).toISOString().slice(0, 16));
          }
          toast.success("Draft loaded for editing");
        }
      } catch (e) {
        console.error("Failed to load draft:", e);
        toast.error("Failed to load draft");
      }
    })();
    return () => { cancelled = true; };
  }, [draftId]);

  // Once both accounts and the draft's linked account ID are known, restore the selection
  useEffect(() => {
    if (!draftXAccountId || accounts.length === 0) return;
    if (accounts.some((a) => a.id === draftXAccountId)) {
      setTargetAccountIds([draftXAccountId]);
    }
  }, [draftXAccountId, accounts]);

  const handleSaveTemplate = async () => {
    if (!templateTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await createUserTemplate({
        title: templateTitle,
        description: templateDescription,
        category: templateCategory,
        content: tweets.map(t => t.content)
      });
      toast.success("Template saved!");
      setIsSaveTemplateOpen(false);
      setTemplateTitle("");
      setTemplateDescription("");
      setTemplateCategory("Personal");
    } catch (e) {
      toast.error("Failed to save template");
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTweets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handlePlanLimit = async (res: Response, fallbackMessage: string) => {
    let payload: PlanLimitPayload | null = null;
    try {
      payload = (await res.json()) as PlanLimitPayload;
    } catch {
    }

    openUpgradeModal({
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
    throw new Error(payload?.message || fallbackMessage);
  };

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

  const moveTweet = (fromIndex: number, toIndex: number) => {
    setTweets((items) => arrayMove(items, fromIndex, toIndex));
  };

  const updateTweet = (id: string, content: string) => {
    setTweets(
      tweets.map((t) => (t.id === id ? { ...t, content } : t))
    );
  };

  const updateTweetPreview = (id: string, preview: any) => {
    setTweets(
      tweets.map((t) => (t.id === id ? { ...t, linkPreview: preview } : t))
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
      const maxLen = 1000 - prefix.length;
      const next = cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
      return { ...t, content: `${prefix}${next}` };
    });
  };

  const openAiTool = (tool: "thread" | "hook" | "cta" | "rewrite" | "translate" | "hashtags", tweetId?: string) => {
    setAiTool(tool);
    setGeneratedHashtags([]);
    if ((tool === "rewrite" || tool === "hashtags") && tweetId) {
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

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/ai/history");
      const data = await res.json();
      setHistoryItems(data.history);
    } catch (e) {
      console.error(e);
    }
  };

  // AI Image Dialog handlers
  const openAiImageDialog = (tweetId: string) => {
    setAiImageTargetTweetId(tweetId);
    setIsAiImageOpen(true);
  };

  const handleAiImageAttach = (image: {
    imageUrl: string;
    width: number;
    height: number;
    model: string;
    prompt: string;
  }) => {
    if (!aiImageTargetTweetId) return;

    // Add image to the tweet's media array
    setTweets((prev) =>
      prev.map((tweet) => {
        if (tweet.id === aiImageTargetTweetId) {
          return {
            ...tweet,
            media: [
              ...tweet.media,
              {
                url: image.imageUrl,
                mimeType: "image/png",
                fileType: "image" as const,
                size: 0, // Will be determined on upload
              },
            ],
          };
        }
        return tweet;
      })
    );
  };

  const restoreHistory = (item: any) => {
    const content = item.outputContent;
    if (!content) return;

    if (item.type === "thread" && content.tweets) {
        setTweets(content.tweets.map((t: string) => ({
            id: Math.random().toString(36).substr(2, 9),
            content: t,
            media: []
        })));
        setIsAiOpen(false);
        toast.success("Restored thread from history");
    } else if ((item.type === "hook" || item.type === "rewrite" || item.type === "cta") && content.text) {
        if (aiTargetTweetId) {
            updateTweet(aiTargetTweetId, content.text);
        } else if (tweets[0]) {
            updateTweet(tweets[0].id, content.text);
        }
        setIsAiOpen(false);
        toast.success("Restored content from history");
    } else if (item.type === "translate" && content.tweets) {
        setTweets(content.tweets.map((t: string, idx: number) => ({
            ...tweets[idx] || { id: Math.random().toString(36).substr(2, 9), media: [] },
            content: t,
        })));
        setIsAiOpen(false);
        toast.success("Restored translation from history");
    } else if (item.type === "hashtags" && content.hashtags) {
        setGeneratedHashtags(content.hashtags);
        setAiTool("hashtags");
        // Don't close, let them pick
    }
  };

  const restoreId = searchParams?.get("restore");

  useEffect(() => {
    if (restoreId) {
      fetch(`/api/ai/history?id=${restoreId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.item) {
            restoreHistory(data.item);
            window.history.replaceState(null, "", "/dashboard/compose");
          }
        })
        .catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreId]);

  const handleTemplateSelect = (contents: string[]) => {
    setTweets(contents.map(c => ({
      id: Math.random().toString(36).substr(2, 9),
      content: c,
      media: []
    })));
    toast.success("Template applied!");
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
            await handlePlanLimit(res, "AI limit reached. Upgrade to continue.");
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
            await handlePlanLimit(res, "AI limit reached. Upgrade to continue.");
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
            await handlePlanLimit(res, "AI limit reached. Upgrade to continue.");
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
            await handlePlanLimit(res, "AI limit reached. Upgrade to continue.");
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

      if (aiTool === "hashtags") {
        const targetId = aiTargetTweetId;
        if (!targetId) throw new Error("No tweet selected");
        const t = tweets.find((x) => x.id === targetId);
        if (!t?.content.trim()) throw new Error("Tweet is empty");

        const res = await fetch("/api/ai/hashtags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: t.content,
            language: aiLanguage,
          }),
        });
        if (!res.ok) {
          if (res.status === 402) {
            await handlePlanLimit(res, "AI limit reached. Upgrade to continue.");
          }
          throw new Error("Hashtag generation failed");
        }
        const data = await res.json();
        setGeneratedHashtags(data.hashtags || []);
        toast.success("Hashtags generated!");
        return; // Keep dialog open
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
          await handlePlanLimit(res, "AI limit reached. Upgrade to continue.");
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
      let res: Response;
      if (editingDraftId) {
        // Update the existing draft via PATCH
        res = await fetch(`/api/posts/${editingDraftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tweets: tweets.map(t => ({
              content: t.content,
              media: t.media,
            })),
            scheduledAt: scheduledDate || undefined,
            action,
          }),
        });
      } else {
        res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tweets: tweets.map(t => ({
              content: t.content,
              media: t.media,
            })),
            targetAccountIds,
            scheduledAt: scheduledDate || undefined,
            recurrencePattern: recurrencePattern === "none" ? undefined : recurrencePattern,
            recurrenceEndDate: recurrenceEndDate || undefined,
            action,
          }),
        });
      }

      if (!res.ok) {
        if (res.status === 402) {
          await handlePlanLimit(res, "Plan limit reached. Upgrade to continue.");
        }
        const error = await res.json();
        throw new Error(error.error || "Failed to submit");
      }

      let message: string;
      if (editingDraftId) {
        if (action === "draft") message = "Draft saved!";
        else if (action === "schedule") message = "Post scheduled!";
        else message = "Post sent to queue — publishing shortly.";
      } else {
        const data = await res.json();
        const count = Array.isArray(data.postIds) ? data.postIds.length : 1;
        if (action === "schedule") {
          message = count > 1 ? `Scheduled ${count} posts.` : "Post scheduled!";
        } else if (action === "publish_now") {
          // Posts are handed off to the background worker — they publish within seconds,
          // not instantly. "Sent to queue" is accurate; "published" would be premature.
          message = count > 1 ? `${count} posts sent to queue — publishing shortly.` : "Post sent to queue — publishing shortly.";
        } else {
          message = count > 1 ? `Created ${count} drafts.` : "Post drafted!";
        }
      }

      toast.success(message);
      setTweets([{ id: Math.random().toString(36).substr(2, 9), content: "", media: [] }]);
      setScheduledDate("");
      setRecurrencePattern("none");
      setRecurrenceEndDate("");
      setEditingDraftId(null);
      localStorage.removeItem("astra-post-drafts"); // Clear auto-save
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAccount = accounts.find(a => targetAccountIds.includes(a.id)) || accounts[0];
  const userImage = selectedAccount?.avatarUrl || session?.user?.image;
  const userName = selectedAccount?.displayName || session?.user?.name || "User Name";
  const userHandle = selectedAccount?.username ? `@${selectedAccount.username}` : session?.user?.email ? `@${session.user.email.split('@')[0]}` : "@handle";

  const aiDialogTitle =
    aiTool === "thread" ? "AI Thread Writer" :
    aiTool === "hook" ? "AI Hook Generator" :
    aiTool === "cta" ? "AI CTA Generator" :
    aiTool === "translate" ? "AI Translate Thread" :
    aiTool === "hashtags" ? "AI Hashtag Generator" : "AI Rewrite";

  const aiDialogDesc =
    aiTool === "thread" ? "Generate a thread about any topic instantly." :
    aiTool === "hook" ? "Generate a strong first tweet to start your thread." :
    aiTool === "cta" ? "Generate a short call-to-action to end your thread." :
    aiTool === "translate" ? "Translate the entire thread while keeping tweet limits." :
    aiTool === "hashtags" ? "Generate trending hashtags for your tweet." : "Rewrite a tweet in a new tone.";

  const isAiGenerateDisabled =
    isGenerating ||
    (aiTool === "thread" && !aiTopic) ||
    (aiTool === "hook" && !aiTopic && !(tweets[0]?.content || "").trim()) ||
    (aiTool === "rewrite" && !aiRewriteText.trim());

  const aiTabsGenerateContent = (
    <TabsContent value="generate" className="flex-1 overflow-y-auto py-4 space-y-4">
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
          <Select value={aiTranslateTarget} onValueChange={setAiTranslateTarget}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(l => (
                <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              {LANGUAGES.map(l => (
                <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
              ))}
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

      {aiTool === "hashtags" && generatedHashtags.length > 0 && (
        <div className="space-y-3">
          <Label>Generated Hashtags (Click to add)</Label>
          <div className="flex flex-wrap gap-2">
            {generatedHashtags.map((tag) => (
              <Button
                key={tag}
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (aiTargetTweetId) {
                    const t = tweets.find(x => x.id === aiTargetTweetId);
                    if (t) updateTweet(aiTargetTweetId, `${t.content} ${tag}`.trim());
                    toast.success(`Added ${tag}`);
                  }
                }}
              >
                {tag}
              </Button>
            ))}
          </div>
        </div>
      )}
    </TabsContent>
  );

  const aiTabsHistoryContent = (
    <TabsContent value="history" className="flex-1 overflow-y-auto">
      <div className="space-y-2">
        {historyItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No history found.</div>
        ) : (
          historyItems.map((item) => (
            <div
              key={item.id}
              className="p-3 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => restoreHistory(item)}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-sm capitalize flex items-center gap-2">
                  {item.type === "thread" ? <Sparkles className="w-3 h-3 text-primary" /> :
                   item.type === "hashtags" ? <Hash className="w-3 h-3 text-primary" /> :
                   <Sparkles className="w-3 h-3" />}
                  {item.type}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {item.inputPrompt?.split('\n')[0] || "No prompt"}
              </p>
            </div>
          ))
        )}
      </div>
    </TabsContent>
  );

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
        <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext 
                items={tweets.map(t => t.id)}
                strategy={verticalListSortingStrategy}
            >
                {tweets.map((tweet, index) => (
                    <SortableTweet
                        key={tweet.id}
                        id={tweet.id}
                        tweet={tweet}
                        index={index}
                        totalTweets={tweets.length}
                        updateTweet={updateTweet}
                        updateTweetPreview={updateTweetPreview}
                        removeTweet={removeTweet}
                        removeTweetMedia={removeTweetMedia}
                        triggerFileUpload={triggerFileUpload}
                        openAiTool={openAiTool}
                        openAiImage={openAiImageDialog}
                        onMove={moveTweet}
                    />
                ))}
            </SortableContext>
        </DndContext>

        {tweets.some((t) => t.content.length > 280) && (
          <Alert className="border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400">
            <Info className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              <span className="font-medium">X Premium required for long posts.</span>{" "}
              One or more of your tweets exceeds 280 characters. Standard X accounts are limited to 280 characters per tweet — posts beyond this limit will only publish successfully on{" "}
              <span className="font-medium">X Premium</span> accounts. If you&apos;re on a standard account, these tweets will fail and appear as errors in your queue.
            </AlertDescription>
          </Alert>
        )}

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
            {/* AI Tools — Primary */}
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">AI Tools</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => openAiTool("thread")}
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Writer
                </Button>
                <TemplatesDialog onSelect={handleTemplateSelect} />
              </div>
              <InspirationPanel
                language={aiLanguage}
                onSelect={(topic) => {
                  setAiTopic(topic);
                  openAiTool("thread");
                }}
              />

              {/* Secondary tools — dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-muted-foreground">
                    More Tools
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  <DropdownMenuItem onClick={() => openAiTool("hook")}>
                    <Zap className="mr-2 h-4 w-4" />
                    Hook Idea
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openAiTool("cta")}>
                    <Megaphone className="mr-2 h-4 w-4" />
                    Call to Action
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openAiTool("translate")}>
                    <Globe className="mr-2 h-4 w-4" />
                    Translate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTweets(applyNumbering([...tweets]))}>
                    <ListOrdered className="mr-2 h-4 w-4" />
                    Number 1/N
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Post to accounts</label>
              <TargetAccountsSelect 
                  value={targetAccountIds} 
                  onChange={setTargetAccountIds}  
                  accounts={accounts}
                  loading={accountsLoading}
              />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Schedule for</label>
                {/* Split into date + time to avoid native calendar popup overflowing on mobile */}
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    aria-label="Schedule date"
                    value={scheduledDate ? scheduledDate.slice(0, 10) : ""}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      if (!newDate) {
                        setScheduledDate("");
                        setRecurrencePattern("none");
                        setRecurrenceEndDate("");
                      } else {
                        const existingTime = scheduledDate ? scheduledDate.slice(11, 16) : "12:00";
                        setScheduledDate(`${newDate}T${existingTime}`);
                      }
                    }}
                  />
                  <Select
                    value={scheduledDate ? scheduledDate.slice(11, 16) : ""}
                    disabled={!scheduledDate}
                    onValueChange={(newTime) => {
                      const existingDate = scheduledDate ? scheduledDate.slice(0, 10) : "";
                      if (existingDate) setScheduledDate(`${existingDate}T${newTime}`);
                    }}
                  >
                    <SelectTrigger aria-label="Schedule time">
                      <SelectValue placeholder="Time" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((slot) => (
                        <SelectItem key={slot.value} value={slot.value}>
                          {slot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {browserTimezone && (
                  <p className="text-xs text-muted-foreground">
                    Times are in{" "}
                    <span className="font-medium text-foreground">{browserTimezone}</span>
                    {" "}
                    <span className="tabular-nums">
                      (UTC{(() => {
                        const off = -new Date().getTimezoneOffset();
                        const h = Math.floor(Math.abs(off) / 60);
                        const m = Math.abs(off) % 60;
                        return `${off >= 0 ? "+" : "-"}${h}${m > 0 ? `:${String(m).padStart(2, "0")}` : ""}`;
                      })()})
                    </span>
                  </p>
                )}
                <BestTimeSuggestions onSelect={setScheduledDate} />

                {/* Recurrence Options */}
                {scheduledDate && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Repeat</label>
                            <Select value={recurrencePattern} onValueChange={setRecurrencePattern}>
                                <SelectTrigger className="h-8">
                                    <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Never</SelectItem>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="yearly">Yearly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {recurrencePattern !== "none" && (
                             <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">End Date</label>
                                <Input 
                                    type="date" 
                                    className="h-8"
                                    value={recurrenceEndDate}
                                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <Button
                    className="w-full h-11 text-base font-semibold"
                    onClick={() => handleSubmit(scheduledDate ? "schedule" : "publish_now")}
                    disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {scheduledDate ? "Schedule Post" : "Post Now"}
                </Button>

                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleSubmit("draft")}
                    disabled={isSubmitting}
                >
                    <FileText className="mr-2 h-4 w-4" />
                    Save as Draft
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setIsSaveTemplateOpen(true)}
                    disabled={isSubmitting}
                >
                    Save as Template
                </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isSaveTemplateOpen} onOpenChange={setIsSaveTemplateOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Save as Template</DialogTitle>
                    <DialogDescription>Save your current thread structure as a reusable template.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Title</Label>
                        <Input 
                          value={templateTitle} 
                          onChange={e => setTemplateTitle(e.target.value)} 
                          placeholder="My Awesome Template" 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Input 
                          value={templateDescription} 
                          onChange={e => setTemplateDescription(e.target.value)} 
                          placeholder="Optional description" 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={templateCategory} onValueChange={setTemplateCategory}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Personal">Personal</SelectItem>
                                <SelectItem value="Educational">Educational</SelectItem>
                                <SelectItem value="Promotional">Promotional</SelectItem>
                                <SelectItem value="Engagement">Engagement</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsSaveTemplateOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveTemplate} disabled={!templateTitle.trim() || isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Template
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">Mobile Preview</h3>
            <ViralScoreBadge content={previewTweet?.content || ""} />
          </div>
          <div className="bg-background border rounded-md p-4 space-y-4">
             <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-muted shrink-0 overflow-hidden relative">
                    {userImage ? (
                        <Image src={userImage} alt={userName} fill sizes="40px" className="object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground font-bold">
                            {userName[0]?.toUpperCase() || "U"}
                        </div>
                    )}
                </div>
                <div className="space-y-1 w-full">
                   <div className="flex items-center gap-1 text-sm">
                      <span className="font-bold">{userName}</span>
                      <span className="text-muted-foreground">{userHandle}</span>
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
                   {previewTweet?.linkPreview && !previewTweet.media.length && (
                       <div className="mt-2 border rounded-md overflow-hidden">
                           {previewTweet.linkPreview.images?.[0] && (
                               <div className="relative h-48 w-full">
                                   <Image src={previewTweet.linkPreview.images[0]} alt="Preview" fill className="object-cover" />
                               </div>
                           )}
                           <div className="p-3 bg-muted/20">
                               <h4 className="font-medium text-sm line-clamp-1">{previewTweet.linkPreview.title}</h4>
                               <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{previewTweet.linkPreview.description}</p>
                               <p className="text-xs text-muted-foreground mt-1 lowercase">{new URL(previewTweet.linkPreview.url).hostname}</p>
                           </div>
                       </div>
                   )}
                </div>
             </div>
          </div>
        </div>
      </div>
      {isDesktop ? (
        <Dialog open={isAiOpen} onOpenChange={setIsAiOpen}>
          <DialogContent className="max-w-2xl h-[90dvh] max-h-[600px] flex flex-col overflow-y-auto">
            <Tabs defaultValue="generate" className="flex-1 flex flex-col">
              <DialogHeader>
                <div className="flex items-center justify-between pr-8">
                  <DialogTitle>{aiDialogTitle}</DialogTitle>
                  <TabsList>
                    <TabsTrigger value="generate">Generate</TabsTrigger>
                    <TabsTrigger value="history" onClick={fetchHistory}>History</TabsTrigger>
                  </TabsList>
                </div>
                <DialogDescription>{aiDialogDesc}</DialogDescription>
              </DialogHeader>
              {aiTabsGenerateContent}
              {aiTabsHistoryContent}
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setIsAiOpen(false)}>Cancel</Button>
                <Button onClick={handleAiRun} disabled={isAiGenerateDisabled}>
                  {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate
                </Button>
              </DialogFooter>
            </Tabs>
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={isAiOpen} onOpenChange={setIsAiOpen}>
          <SheetContent side="bottom" className="h-[90dvh] flex flex-col overflow-hidden pb-safe">
            <Tabs defaultValue="generate" className="flex-1 flex flex-col overflow-hidden">
              <SheetHeader className="shrink-0 pb-2">
                <div className="flex items-center justify-between">
                  <SheetTitle>{aiDialogTitle}</SheetTitle>
                  <TabsList>
                    <TabsTrigger value="generate">Generate</TabsTrigger>
                    <TabsTrigger value="history" onClick={fetchHistory}>History</TabsTrigger>
                  </TabsList>
                </div>
                <SheetDescription>{aiDialogDesc}</SheetDescription>
              </SheetHeader>
              {aiTabsGenerateContent}
              {aiTabsHistoryContent}
              <div className="flex justify-end gap-2 pt-4 shrink-0 border-t mt-2">
                <Button variant="outline" onClick={() => setIsAiOpen(false)}>Cancel</Button>
                <Button onClick={handleAiRun} disabled={isAiGenerateDisabled}>
                  {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate
                </Button>
              </div>
            </Tabs>
          </SheetContent>
        </Sheet>
      )}

      {/* AI Image Dialog */}
      <AiImageDialog
        open={isAiImageOpen}
        onOpenChange={setIsAiImageOpen}
        tweetContent={
          aiImageTargetTweetId
            ? tweets.find((t) => t.id === aiImageTargetTweetId)?.content || ""
            : ""
        }
        onImageAttach={handleAiImageAttach}
        availableModels={userPlanLimits.availableModels}
        userPreferredModel={userPlanLimits.preferredModel}
        remainingQuota={userPlanLimits.remainingQuota}
      />
    </div>
  );
}
