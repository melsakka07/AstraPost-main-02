
"use client";

import { useState, useRef, useEffect, useId } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  BookmarkPlus,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
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
  X as XIcon,
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSession } from "@/lib/auth-client";
import { LANGUAGES } from "@/lib/constants";
import { createUserTemplate, type TemplateAiMeta } from "@/lib/templates";

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
    uploading?: boolean;
    placeholderId?: string;
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
  return { value, label: `${displayH}:${m} ${period}`, hour: h };
});

const TIME_SLOT_GROUPS = [
  { label: "Morning", slots: TIME_SLOTS.filter(s => s.hour >= 5 && s.hour < 12) },
  { label: "Afternoon", slots: TIME_SLOTS.filter(s => s.hour >= 12 && s.hour < 17) },
  { label: "Evening", slots: TIME_SLOTS.filter(s => s.hour >= 17 && s.hour < 21) },
  { label: "Night", slots: TIME_SLOTS.filter(s => s.hour >= 21 || s.hour < 5) },
];

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  return `${Math.floor(seconds / 60)}m ago`;
}

export function Composer() {
  const dndId = useId();
  const searchParams = useSearchParams();
  const draftId = searchParams?.get("draft");
  const [tweets, setTweets] = useState<TweetDraft[]>([
    { id: "1", content: "", media: [] },
  ]);
  const [scheduledDate, setScheduledDate] = useState<string>(
    searchParams?.get("scheduledAt") ?? ""
  );
  const [browserTimezone, setBrowserTimezone] = useState<string | null>(null);
  const [recurrencePattern, setRecurrencePattern] = useState<string>("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetAccountIds, setTargetAccountIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Tracks whether bridge content (sessionStorage / URL prefill) was loaded on
  // mount, so the localStorage auto-save restore doesn't overwrite it.
  const bridgeLoadedRef = useRef(false);
  const [activeTweetId, setActiveTweetId] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<SocialAccountLite[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  // Used to restore the draft's linked account once accounts have loaded
  const [draftXAccountId, setDraftXAccountId] = useState<string | null>(null);

  // W4: Source attribution from Inspiration page
  const [sourceAttribution, setSourceAttribution] = useState<{ handle: string; url: string } | null>(null);
  // W5: Calendar metadata hint (tone + topic) from Content Calendar page
  const [calendarMeta, setCalendarMeta] = useState<{ tone: string; topic: string } | null>(null);

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

  // Sync AI language with user's preferred language once session loads
  useEffect(() => {
    if (session?.user && "language" in session.user) {
      setAiLanguage((session.user as any).language || "ar");
    }
  }, [session?.user]);
  const [aiAddNumbering, setAiAddNumbering] = useState(true);
  const [aiTranslateTarget, setAiTranslateTarget] = useState<string>("en");
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateCategory, setTemplateCategory] = useState("Personal");
  // AI meta from the last template generation — stored so it can be saved with the template
  const [lastTemplateAiMeta, setLastTemplateAiMeta] = useState<TemplateAiMeta | null>(null);

  // Overwrite confirmation (C1)
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [pendingTweets, setPendingTweets] = useState<TweetDraft[] | null>(null);

  // Preview carousel index (H6)
  const [previewIndex, setPreviewIndex] = useState(0);

  // Auto-save timestamp (H5)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

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
    setMounted(true);
  }, []);

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

  // ── Composer Bridge ─────────────────────────────────────────────────────────
  // Reads content injected by AI tool pages via sessionStorage or the ?prefill
  // URL param. Priority order:
  //   1. composer_payload  (AI Writer, Affiliate — multi-tweet array)
  //   2. inspiration_tweets (Inspiration page — adapted tweet array)
  //   3. ?prefill=<text>   (Calendar, Reply — single tweet string)
  // Sets bridgeLoadedRef so the localStorage auto-save restore below doesn't
  // overwrite content that was just injected.
  useEffect(() => {
    if (draftId) return; // Hard draft from URL takes highest priority

    // 1. composer_payload (AI Writer, Affiliate, Hashtag Generator)
    const payloadStr = sessionStorage.getItem("composer_payload");
    if (payloadStr) {
      try {
        const payload = JSON.parse(payloadStr) as { tweets?: string[] };
        if (Array.isArray(payload.tweets) && payload.tweets.length > 0) {
          setTweets(
            payload.tweets.map((c) => ({
              id: Math.random().toString(36).substr(2, 9),
              content: c,
              media: [],
            }))
          );
          bridgeLoadedRef.current = true;
          sessionStorage.removeItem("composer_payload");
          return;
        }
      } catch {
        // Malformed payload — fall through
      }
    }

    // 2. inspiration_tweets (Inspiration page)
    const inspirationStr = sessionStorage.getItem("inspiration_tweets");
    if (inspirationStr) {
      try {
        // W4: Read source attribution before removing from storage
        const attributionStr = sessionStorage.getItem("inspiration_attribution");
        if (attributionStr) {
          try { setSourceAttribution(JSON.parse(attributionStr) as { handle: string; url: string }); } catch {}
          sessionStorage.removeItem("inspiration_attribution");
        }

        const inspirationTweets = JSON.parse(inspirationStr) as string[];
        if (Array.isArray(inspirationTweets) && inspirationTweets.length > 0) {
          setTweets(
            inspirationTweets.map((c) => ({
              id: Math.random().toString(36).substr(2, 9),
              content: c,
              media: [],
            }))
          );
          bridgeLoadedRef.current = true;
          sessionStorage.removeItem("inspiration_tweets");
          sessionStorage.removeItem("inspiration_source_id");
          return;
        }
      } catch {
        // Malformed — fall through
      }
    }

    // 3. ?prefill=<text> URL param (Calendar, Reply Suggester)
    const prefill = searchParams?.get("prefill");
    if (prefill) {
      setTweets([{ id: "1", content: prefill, media: [] }]);
      bridgeLoadedRef.current = true;
      // W5: Read calendar metadata (tone + topic) passed from Content Calendar
      const calendarTone = searchParams?.get("tone");
      const calendarTopic = searchParams?.get("topic");
      if (calendarTone || calendarTopic) {
        setCalendarMeta({ tone: calendarTone ?? "", topic: calendarTopic ?? "" });
      }
      // Remove the param without a navigation so Back still works
      window.history.replaceState(null, "", "/dashboard/compose");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save
  useEffect(() => {
    if (draftId) return; // Draft will be loaded from API — skip localStorage restore
    if (bridgeLoadedRef.current) return; // Bridge content loaded — don't overwrite
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
      // Strip uploading placeholders before persisting so reloads don't show ghost items
      const saveable = tweets.map((t) => ({
        ...t,
        media: t.media.filter((m) => !m.uploading),
      }));
      localStorage.setItem("astra-post-drafts", JSON.stringify(saveable));
      setLastSavedAt(new Date());
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
        content: tweets.map(t => t.content),
        ...(lastTemplateAiMeta ? { aiMeta: lastTemplateAiMeta } : {}),
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

  const handlePlanLimit = async (res: Response, _fallbackMessage: string) => {
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
  };

  const addTweet = () => {
    setTweets([
      ...tweets,
      { id: Math.random().toString(36).substr(2, 9), content: "", media: [] },
    ]);
  };

  const removeTweet = (id: string) => {
    if (tweets.length === 1) return;
    const previousTweets = [...tweets];
    const nextTweets = tweets.filter((t) => t.id !== id);
    setTweets(nextTweets);
    setPreviewIndex((prev) => Math.min(prev, nextTweets.length - 1));
    toast("Tweet removed", {
      action: {
        label: "Undo",
        onClick: () => {
          setTweets(previousTweets);
          setPreviewIndex((prev) => Math.min(prev, previousTweets.length - 1));
        },
      },
    });
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
      if (tool === "thread" && !aiTopic) {
        const existingContent = tweets[0]?.content?.trim();
        if (existingContent) {
          setAiTopic(existingContent.slice(0, 500));
        }
      }
    }
    setIsAiOpen(true);
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

  const handleTemplateSelect = (contents: string[], aiMeta?: TemplateAiMeta) => {
    const newTweets = contents.map((c) => ({
      id: Math.random().toString(36).substr(2, 9),
      content: c,
      media: [] as TweetDraft["media"],
    }));
    // Store AI meta so it can be embedded when saving as a template
    setLastTemplateAiMeta(aiMeta ?? null);
    // C1: ask before overwriting existing content
    if (tweets.some((t) => t.content.trim())) {
      setPendingTweets(newTweets);
      setConfirmOverwrite(true);
      return;
    }
    setTweets(newTweets);
    setPreviewIndex(0);
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
            return;
          } else if (res.status === 429) {
            const body = await res.json().catch(() => ({})) as { retryAfter?: number };
            const wait = body.retryAfter ? ` Try again in ${body.retryAfter}s.` : "";
            toast.error(`Rate limit reached.${wait}`);
          }
          throw new Error("Generation failed");
        }
        if (!res.body) throw new Error("No response body");

        // Read SSE stream — the endpoint returns text/event-stream, not JSON
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";
        let streamDone = false;
        const collectedTweets: string[] = [];

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const jsonStr = trimmed.slice(6);
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr) as {
                done?: boolean;
                error?: string;
                index?: number;
                tweet?: string;
              };
              if (event.error) {
                toast.error("Generation failed. Please try again.");
                streamDone = true;
                break;
              }
              if (event.done) { streamDone = true; break; }
              if (typeof event.tweet === "string" && event.tweet.length > 0) {
                collectedTweets.push(event.tweet);
              }
            } catch {
              // partial line — skip
            }
          }
        }

        if (collectedTweets.length === 0) throw new Error("No tweets generated");

        let newTweets: TweetDraft[] = collectedTweets.map((content) => ({
          id: Math.random().toString(36).substr(2, 9),
          content,
          media: [],
        }));
        if (aiAddNumbering) {
          newTweets = applyNumbering(newTweets);
        }
        // C1: ask before overwriting existing content
        if (tweets.some((t) => t.content.trim())) {
          setPendingTweets(newTweets);
          setConfirmOverwrite(true);
          return;
        }
        setTweets(newTweets);
        setPreviewIndex(0);
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
            return;
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
            return;
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
            return;
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
            return;
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
          return;
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

    const tweetId = activeTweetId;
    const existingCount = tweets.find((t) => t.id === tweetId)?.media.length ?? 0;
    const remaining = Math.max(0, 4 - existingCount);
    const toUpload = files.slice(0, remaining);

    if (fileInputRef.current) fileInputRef.current.value = "";

    if (toUpload.length === 0) {
      toast.error("Max 4 media per tweet");
      return;
    }

    // Add placeholder spinner items immediately so the user sees feedback
    const placeholders: TweetDraft["media"] = toUpload.map((file) => ({
      url: "",
      mimeType: file.type,
      fileType: (file.type.startsWith("video/") ? "video" : file.type === "image/gif" ? "gif" : "image") as "image" | "video" | "gif",
      size: file.size,
      uploading: true,
      placeholderId: Math.random().toString(36).slice(2, 11),
    }));

    setTweets((prev) =>
      prev.map((t) => (t.id === tweetId ? { ...t, media: [...t.media, ...placeholders] } : t))
    );

    let successCount = 0;
    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i]!;
      const { placeholderId } = placeholders[i]!;
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/media/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const msg = await res.text().catch(() => "Upload failed");
          throw new Error(msg || "Upload failed");
        }
        const data = await res.json();
        // Replace placeholder with real media item
        setTweets((prev) =>
          prev.map((t) =>
            t.id === tweetId
              ? {
                  ...t,
                  media: t.media.map((m) =>
                    m.placeholderId === placeholderId
                      ? { url: data.url, mimeType: data.mimeType, fileType: data.fileType, size: data.size }
                      : m
                  ),
                }
              : t
          )
        );
        successCount++;
      } catch (error) {
        console.error(error);
        // Remove failed placeholder
        setTweets((prev) =>
          prev.map((t) =>
            t.id === tweetId ? { ...t, media: t.media.filter((m) => m.placeholderId !== placeholderId) } : t
          )
        );
        toast.error(error instanceof Error ? error.message : "Failed to upload file");
      }
    }

    if (successCount > 0) {
      toast.success(successCount === 1 ? "Media uploaded" : `${successCount} files uploaded`);
    }
  };

  const triggerFileUpload = (tweetId: string) => {
    setActiveTweetId(tweetId);
    fileInputRef.current?.click();
  };

  const handleSubmit = async (action: "draft" | "schedule" | "publish_now") => {
    const isUploading = tweets.some((t) => t.media.some((m) => m.uploading));
    if (isUploading) {
      toast.error("Please wait for all media to finish uploading.");
      return;
    }

    // Validate that every tweet has content (API rejects empty strings)
    const emptyIndex = tweets.findIndex((t) => !t.content.trim());
    if (emptyIndex !== -1) {
      const label = tweets.length > 1 ? `Tweet ${emptyIndex + 1} is empty.` : "Tweet content cannot be empty.";
      toast.error(label);
      return;
    }
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
            scheduledAt: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
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
            scheduledAt: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
            recurrencePattern: recurrencePattern === "none" ? undefined : recurrencePattern,
            recurrenceEndDate: recurrenceEndDate || undefined,
            action,
          }),
        });
      }

      if (!res.ok) {
        if (res.status === 402) {
          await handlePlanLimit(res, "Plan limit reached. Upgrade to continue.");
          return;
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
      setPreviewIndex(0);
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
  const userImage = mounted ? (selectedAccount?.avatarUrl || session?.user?.image) : null;
  const userName = selectedAccount?.displayName || session?.user?.name || "User Name";
  const userHandle = selectedAccount?.username ? `@${selectedAccount.username}` : session?.user?.email ? `@${session.user.email.split('@')[0]}` : "@handle";

  // Preview carousel — computed after all state declarations (H6)
  const safePreviewIndex = Math.min(previewIndex, tweets.length - 1);
  const previewTweet = tweets[safePreviewIndex];

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
    (aiTool === "rewrite" && !aiRewriteText.trim()) ||
    (aiTool === "hashtags" && !(tweets.find((t) => t.id === aiTargetTweetId)?.content ?? "").trim());

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

      {aiTool === "hashtags" && (
        <div className="space-y-2">
          <Label>Tweet content</Label>
          <div className="rounded-md border bg-muted/30 px-3 py-2.5 text-sm min-h-[60px]">
            {tweets.find((t) => t.id === aiTargetTweetId)?.content || (
              <span className="text-xs italic text-muted-foreground">
                No content yet — type something in the tweet editor first
              </span>
            )}
          </div>
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
              max={15}
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


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*,video/*"
        multiple
        onChange={handleFileUpload}
        title="Upload media files"
        aria-label="Upload media files"
      />

      {/* Editor Column */}
      <div className="lg:col-span-2 space-y-4">
        {/* W4: Inspiration attribution banner */}
        {sourceAttribution && (
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              Inspired by{" "}
              <a
                href={sourceAttribution.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:underline"
              >
                @{sourceAttribution.handle}
              </a>
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => setSourceAttribution(null)}
              aria-label="Dismiss attribution"
            >
              <XIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* W5: Calendar metadata hint banner */}
        {calendarMeta && (calendarMeta.tone || calendarMeta.topic) && (
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground flex-wrap">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              {calendarMeta.topic && (
                <span>Topic: <span className="font-medium text-foreground">{calendarMeta.topic}</span></span>
              )}
              {calendarMeta.topic && calendarMeta.tone && (
                <span className="text-border/60">·</span>
              )}
              {calendarMeta.tone && (
                <span>Tone: <span className="font-medium text-foreground capitalize">{calendarMeta.tone}</span></span>
              )}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => setCalendarMeta(null)}
              aria-label="Dismiss calendar hint"
            >
              <XIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <DndContext
            id={dndId}
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
                        {...(tweet.id === aiTargetTweetId && generatedHashtags.length > 0 && {
                          suggestedHashtags: generatedHashtags,
                          onHashtagClick: (tag: string) => {
                            updateTweet(tweet.id, `${tweet.content} ${tag}`.trim());
                            setGeneratedHashtags((prev) => prev.filter((t) => t !== tag));
                          },
                        })}
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

        {lastSavedAt && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground/60 justify-end px-1">
            <Clock className="h-3 w-3" />
            <span>Auto-saved · {formatTimeAgo(lastSavedAt)}</span>
          </div>
        )}
        <Button
          variant="outline"
          className="w-full py-6 border-dashed"
          onClick={addTweet}
        >
          <Plus className="mr-2 h-4 w-4" />
          {tweets.length === 1 ? "Convert to Thread" : "Add to Thread"}
        </Button>
      </div>

      {/* Sidebar Column */}
      <div className="space-y-4">
        {/* C3: Desktop — inline AI panel replaces content tools card when open */}
        {isAiOpen && isDesktop ? (
          <Card>
            <CardContent className="pt-4">
              <Tabs defaultValue="generate" className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="min-w-0 pr-2">
                    <h3 className="font-semibold text-sm truncate">{aiDialogTitle}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{aiDialogDesc}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setIsAiOpen(false)}
                      aria-label="Close AI panel"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {aiTabsGenerateContent}
                <div className="flex justify-end gap-2 pt-3 border-t mt-2">
                  <Button variant="outline" size="sm" onClick={() => setIsAiOpen(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleAiRun} disabled={isAiGenerateDisabled}>
                    {isGenerating && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    Generate
                  </Button>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          /* Card 1: Content Tools (H1) */
          <Card>
            <CardContent className="pt-5 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">Content Tools</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => openAiTool("thread")}
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Writer
                </Button>
                <InspirationPanel
                  language={aiLanguage}
                  onSelect={(topic) => {
                    setAiTopic(topic);
                    openAiTool("thread");
                  }}
                />
              </div>
              <TemplatesDialog onSelect={(tweets, aiMeta) => handleTemplateSelect(tweets, aiMeta)} defaultLanguage={aiLanguage} />
              {/* H4: Secondary AI tools — 2×2 grid including Hashtags (D5) */}
              <div className="grid grid-cols-2 gap-1.5">
                <Button variant="outline" size="sm" className="w-full justify-center gap-1 text-xs" onClick={() => openAiTool("hook")}>
                  <Zap className="h-3.5 w-3.5" />Hook
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-center gap-1 text-xs" onClick={() => openAiTool("cta")}>
                  <Megaphone className="h-3.5 w-3.5" />CTA
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-center gap-1 text-xs" onClick={() => openAiTool("translate")}>
                  <Globe className="h-3.5 w-3.5" />Translate
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-center gap-1 text-xs" onClick={() => openAiTool("hashtags", activeTweetId ?? tweets[0]?.id)}>
                  <Hash className="h-3.5 w-3.5" />Hashtags
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground text-xs"
                onClick={() => setTweets(applyNumbering([...tweets]))}
              >
                <ListOrdered className="h-3.5 w-3.5" />
                Number tweets (1/N)
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Card 2: Publishing (H1 — split from content tools) */}
        <Card>
          <CardContent className="pt-5 space-y-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">Publishing</p>

            <div className="space-y-2">
              <Label htmlFor="post-accounts">Post to accounts</Label>
              <TargetAccountsSelect
                value={targetAccountIds}
                onChange={setTargetAccountIds}
                accounts={accounts}
                loading={accountsLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule-date">Schedule for</Label>
              <div className="grid grid-cols-2 gap-2">
                <DatePicker
                  id="schedule-date"
                  value={scheduledDate ? scheduledDate.slice(0, 10) : ""}
                  onChange={(newDate) => {
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
                {/* P2: Time grouped by period */}
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
                    {TIME_SLOT_GROUPS.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel>{group.label}</SelectLabel>
                        {group.slots.map((slot) => (
                          <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                        ))}
                      </SelectGroup>
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

              {scheduledDate && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Repeat</label>
                    <Select value={recurrencePattern} onValueChange={setRecurrencePattern}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Never</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {recurrencePattern !== "none" && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">End Date</label>
                      <DatePicker className="h-8" value={recurrenceEndDate} onChange={setRecurrenceEndDate} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* H2: Action context — shows what will happen before the user clicks */}
            <p className="text-xs text-center text-muted-foreground">
              {scheduledDate ? (
                <>Scheduling for{" "}
                  <span className="font-medium text-foreground">
                    {new Date(scheduledDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    {" at "}
                    {new Date(scheduledDate).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  </span>
                </>
              ) : (
                <>Posting immediately to{" "}
                  <span className="font-medium text-foreground">
                    {accounts.find(a => targetAccountIds.includes(a.id))?.username
                      ? `@${accounts.find(a => targetAccountIds.includes(a.id))?.username}`
                      : "selected account"}
                  </span>
                </>
              )}
            </p>

            <div className="flex flex-col gap-2">
              <Button
                className="w-full h-11 text-base font-semibold"
                onClick={() => handleSubmit(scheduledDate ? "schedule" : "publish_now")}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {scheduledDate ? "Schedule Post" : "Post Now"}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => handleSubmit("draft")} disabled={isSubmitting}>
                <FileText className="mr-2 h-4 w-4" />
                Save as Draft
              </Button>
              {/* P6: Template button elevated from ghost to visible outline */}
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => setIsSaveTemplateOpen(true)}
                disabled={isSubmitting}
              >
                <BookmarkPlus className="h-4 w-4" />
                Save as Template
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Template Dialog */}
        <Dialog open={isSaveTemplateOpen} onOpenChange={(v) => {
          setIsSaveTemplateOpen(v);
          if (!v) { setTemplateTitle(""); setTemplateDescription(""); setTemplateCategory("Personal"); }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save as Template</DialogTitle>
              <DialogDescription>Save your current thread structure as a reusable template.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={templateTitle} onChange={e => setTemplateTitle(e.target.value)} placeholder="My Awesome Template" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={templateDescription} onChange={e => setTemplateDescription(e.target.value)} placeholder="Optional description" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={templateCategory} onValueChange={setTemplateCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Personal">Personal</SelectItem>
                    <SelectItem value="Educational">Educational</SelectItem>
                    <SelectItem value="Promotional">Promotional</SelectItem>
                    <SelectItem value="Engagement">Engagement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {lastTemplateAiMeta && (
                <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                  <p className="font-medium text-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary" />
                    AI parameters will be saved
                  </p>
                  <p>Tone: <span className="capitalize text-foreground">{lastTemplateAiMeta.tone}</span></p>
                  <p>Language: <span className="text-foreground">{LANGUAGES.find(l => l.code === lastTemplateAiMeta.language)?.label ?? lastTemplateAiMeta.language}</span></p>
                  <p>Format: <span className="text-foreground capitalize">{lastTemplateAiMeta.outputFormat.replace("-", " ")}</span></p>
                  <p className="text-muted-foreground/70 pt-0.5">You can re-generate this content from My Templates.</p>
                </div>
              )}
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

        {/* H6: Preview carousel — cycles through all tweets */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">
              {tweets.length > 1 ? `Preview · ${safePreviewIndex + 1} / ${tweets.length}` : "Preview"}
            </h3>
            <div className="flex items-center gap-1">
              {tweets.length > 1 && (
                <>
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={safePreviewIndex === 0}
                    onClick={() => setPreviewIndex(i => Math.max(0, i - 1))} aria-label="Previous tweet">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={safePreviewIndex === tweets.length - 1}
                    onClick={() => setPreviewIndex(i => Math.min(tweets.length - 1, i + 1))} aria-label="Next tweet">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
              <ViralScoreBadge content={previewTweet?.content || ""} />
            </div>
          </div>
          <div className="bg-background border rounded-md p-4">
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
                <p className="text-sm whitespace-pre-wrap">{previewTweet?.content || "Preview text will appear here..."}</p>
                {(previewTweet?.media?.length || 0) > 0 && previewTweet?.media?.[0]?.url && (
                  <div className="mt-2 rounded-lg overflow-hidden border">
                    {previewTweet?.media?.[0]?.fileType === "video" ? (
                      <video src={previewTweet.media[0].url} className="w-full h-auto" controls />
                    ) : (
                      <Image src={previewTweet.media[0].url} alt="Preview" width={600} height={400} className="w-full h-auto" />
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
      {/* Mobile AI panel — Sheet (C3: desktop uses inline sidebar panel above) */}
      {!isDesktop && (
        <Sheet open={isAiOpen} onOpenChange={setIsAiOpen}>
          <SheetContent side="bottom" className="h-[90dvh] flex flex-col overflow-hidden pb-safe">
            <Tabs defaultValue="generate" className="flex-1 flex flex-col overflow-hidden">
              <SheetHeader className="shrink-0 pb-2">
                <SheetTitle>{aiDialogTitle}</SheetTitle>
                <SheetDescription>{aiDialogDesc}</SheetDescription>
              </SheetHeader>
              {aiTabsGenerateContent}
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

      {/* C1: Confirm before overwriting existing compose content */}
      <AlertDialog open={confirmOverwrite} onOpenChange={setConfirmOverwrite}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace existing content?</AlertDialogTitle>
            <AlertDialogDescription>
              Generating a new thread will replace your current {tweets.filter(t => t.content.trim()).length} tweet(s) with AI-generated content. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setConfirmOverwrite(false); setPendingTweets(null); }}>
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingTweets) {
                  setTweets(pendingTweets);
                  setPreviewIndex(0);
                  setPendingTweets(null);
                  setIsAiOpen(false);
                  toast.success("Thread generated!");
                }
                setConfirmOverwrite(false);
              }}
            >
              Replace &amp; Generate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
