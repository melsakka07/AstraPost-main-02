"use client";

import { useState, useRef, useEffect, useId, lazy, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  BookmarkPlus,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  Hash,
  Info,
  Lightbulb,
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
import { AiToolsPanel } from "@/components/composer/ai-tools-panel";
import { BestTimeSuggestions } from "@/components/composer/best-time-suggestions";
import { ComposerOnboardingHint } from "@/components/composer/composer-onboarding-hint";
// Phase 1: Removed InspirationPanel import - now using inline panel
import { SortableTweet } from "@/components/composer/sortable-tweet";
import {
  TargetAccountsSelect,
  SocialAccountLite,
} from "@/components/composer/target-accounts-select";
// P4-E: Lazy-load TemplatesDialog — it's 834 lines and only needed on user interaction
const TemplatesDialog = lazy(() =>
  import("@/components/composer/templates-dialog").then((m) => ({ default: m.TemplatesDialog }))
);
import { ViralScoreBadge } from "@/components/composer/viral-score-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { XSubscriptionBadge, type XSubscriptionTier } from "@/components/ui/x-subscription-badge";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useMediaQuery } from "@/hooks/use-media-query";
import { type OutputFormat, type TemplatePromptConfig } from "@/lib/ai/template-prompts";
import { useSession } from "@/lib/auth-client";
import { LANGUAGES } from "@/lib/constants";
import { canPostLongContent } from "@/lib/services/x-subscription";
import { createUserTemplate, type TemplateAiMeta } from "@/lib/templates";
import { cn } from "@/lib/utils";

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

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  return `${Math.floor(seconds / 60)}m ago`;
}

export function Composer() {
  const dndId = useId();
  const searchParams = useSearchParams();
  const draftId = searchParams?.get("draft");
  const [tweets, setTweets] = useState<TweetDraft[]>([{ id: "1", content: "", media: [] }]);
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
  const [sourceAttribution, setSourceAttribution] = useState<{
    handle: string;
    url: string;
  } | null>(null);
  // W5: Calendar metadata hint (tone + topic) from Content Calendar page
  const [calendarMeta, setCalendarMeta] = useState<{ tone: string; topic: string } | null>(null);

  // AI State
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  // Phase 1: Added "inspire" and "template" to tool type (template for Phase 2)
  const [aiTool, setAiTool] = useState<
    "thread" | "inspire" | "template" | "hook" | "cta" | "rewrite" | "translate" | "hashtags"
  >("thread");
  const [aiTargetTweetId, setAiTargetTweetId] = useState<string | null>(null);
  const [aiTopic, setAiTopic] = useState("");
  const [aiHook, setAiHook] = useState("");
  // Phase 1: Inspiration state (moved from dialog to inline panel)
  const [inspirationTopics, setInspirationTopics] = useState<
    Array<{ topic: string; hook: string }>
  >([]);
  const [inspirationNiche, setInspirationNiche] = useState("Technology");
  const [isLoadingInspiration, setIsLoadingInspiration] = useState(false);
  // Phase 2: Template state (moved from dialog to inline panel)
  const [templateConfig, setTemplateConfig] = useState<TemplatePromptConfig | null>(null);
  const [templateFormat, setTemplateFormat] = useState<OutputFormat>("thread-short");
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([]);
  // P3-A: Restore AI tone + language from localStorage (session language takes priority once loaded)
  const [aiTone, setAiTone] = useState<string>(() => {
    if (typeof window === "undefined") return "professional";
    try {
      const saved = JSON.parse(localStorage.getItem("astra-ai-prefs") ?? "{}");
      return saved.tone ?? "professional";
    } catch {
      return "professional";
    }
  });
  const [aiCount, setAiCount] = useState([3]);
  const [aiLanguage, setAiLanguage] = useState<string>(() => {
    if (typeof window === "undefined") return "en";
    try {
      const saved = JSON.parse(localStorage.getItem("astra-ai-prefs") ?? "{}");
      if (saved.language) return saved.language;
    } catch {
      // fall through to browser detection
    }
    const browserLang = navigator.language.split("-")[0] ?? "en";
    const supported: string[] = LANGUAGES.map((l) => l.code);
    return supported.includes(browserLang) ? browserLang : "en";
  });
  const [aiLengthOption, setAiLengthOption] = useState<"short" | "medium" | "long">("short");
  const [aiRewriteText, setAiRewriteText] = useState("");

  // Sync AI language with user's preferred language once session loads (overrides localStorage)
  useEffect(() => {
    if (session?.user && "language" in session.user && (session.user as any).language) {
      setAiLanguage((session.user as any).language);
    }
  }, [session?.user]);

  // P3-A: Persist AI tone + language preferences across sessions
  useEffect(() => {
    try {
      const existing = JSON.parse(localStorage.getItem("astra-ai-prefs") ?? "{}");
      localStorage.setItem(
        "astra-ai-prefs",
        JSON.stringify({ ...existing, tone: aiTone, language: aiLanguage })
      );
    } catch {
      // localStorage unavailable — non-critical
    }
  }, [aiTone, aiLanguage]);

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
  // P2-F: Save original tweets before streaming so we can revert on overwrite rejection
  const preStreamTweetsRef = useRef<TweetDraft[] | null>(null);
  // P2-F: Track streaming progress and pending AI stream confirmation
  const [streamingTweetCount, setStreamingTweetCount] = useState(0);
  const [pendingAiStreamGenerate, setPendingAiStreamGenerate] = useState(false);
  // Phase 0: Undo snapshot for destructive operations
  const previousTweetsRef = useRef<TweetDraft[] | null>(null);
  // Phase 0: Translate confirmation dialog
  const [confirmTranslate, setConfirmTranslate] = useState(false);

  // Preview carousel index (H6)
  const [previewIndex, setPreviewIndex] = useState(0);

  // Auto-save timestamp (H5)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  // P0-A: Delay showing the saved label by 5s to avoid "just now" appearing prematurely
  const [showSavedLabel, setShowSavedLabel] = useState(false);

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
    return () => {
      cancelled = true;
    };
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
          try {
            setSourceAttribution(JSON.parse(attributionStr) as { handle: string; url: string });
          } catch {}
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

  // P0-A: Only show the "Auto-saved" label after a 5s delay to avoid premature "just now"
  useEffect(() => {
    if (!lastSavedAt) {
      setShowSavedLabel(false);
      return;
    }
    setShowSavedLabel(false);
    const t = setTimeout(() => setShowSavedLabel(true), 5000);
    return () => clearTimeout(t);
  }, [lastSavedAt]);

  // P0-E + P2-D: Warn user before closing tab with unsaved content OR active uploads
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const hasUnsavedContent = tweets.some((t) => t.content.trim().length > 0);
      const hasUploadingMedia = tweets.some((t) => t.media.some((m) => m.uploading));
      if (hasUnsavedContent || hasUploadingMedia) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
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
          (t: {
            content?: string;
            media?: Array<{
              fileUrl: string;
              fileType: "image" | "video" | "gif";
              fileSize?: number;
            }>;
          }) => ({
            id: Math.random().toString(36).substr(2, 9),
            content: t.content || "",
            media: (t.media || []).map((m) => ({
              url: m.fileUrl,
              mimeType:
                m.fileType === "image"
                  ? "image/jpeg"
                  : m.fileType === "video"
                    ? "video/mp4"
                    : "image/gif",
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
    return () => {
      cancelled = true;
    };
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
        content: tweets.map((t) => t.content),
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
    } catch {}

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
    // P3-B: When a thread reaches 3+ tweets and auto-numbering is on, apply 1/N prefixes
    const nextTweets: typeof tweets = [
      ...tweets,
      { id: Math.random().toString(36).substr(2, 9), content: "", media: [] },
    ];
    setTweets(aiAddNumbering && nextTweets.length >= 3 ? applyNumbering(nextTweets) : nextTweets);
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

  const clearTweet = (id: string) => {
    const previous = tweets.find((t) => t.id === id);
    if (!previous || (previous.content === "" && previous.media.length === 0)) return;
    setTweets((prev) => prev.map((t) => (t.id === id ? { ...t, content: "", media: [] } : t)));
    setGeneratedHashtags([]);
    toast("Tweet cleared", {
      action: {
        label: "Undo",
        onClick: () => setTweets((prev) => prev.map((t) => (t.id === id ? previous : t))),
      },
    });
  };

  const moveTweet = (fromIndex: number, toIndex: number) => {
    setTweets((items) => arrayMove(items, fromIndex, toIndex));
  };

  const updateTweet = (id: string, content: string) => {
    setTweets(tweets.map((t) => (t.id === id ? { ...t, content } : t)));
  };

  const updateTweetPreview = (id: string, preview: any) => {
    setTweets(tweets.map((t) => (t.id === id ? { ...t, linkPreview: preview } : t)));
  };

  const removeTweetMedia = (id: string, url: string) => {
    setTweets(
      tweets.map((t) => (t.id === id ? { ...t, media: t.media.filter((m) => m.url !== url) } : t))
    );
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

  const removeNumbering = (drafts: TweetDraft[]) =>
    drafts.map((t) => ({ ...t, content: t.content.replace(/^\s*\d+\/\d+\s+/g, "") }));

  // True when every non-empty tweet starts with the N/M prefix pattern
  const isTweetsNumbered = tweets.length > 1 && tweets.every((t) => /^\d+\/\d+\s/.test(t.content));

  // P3-D: Detect dominant language of tweet content to suggest a smart translate target
  const detectTranslateTarget = (content: string): string => {
    const arabicChars = (content.match(/[\u0600-\u06FF]/g) ?? []).length;
    const latinChars = (content.match(/[a-zA-Z]/g) ?? []).length;
    if (arabicChars > latinChars) return "en"; // Arabic content → suggest English
    if (arabicChars === 0 && latinChars > 0) return "ar"; // Latin content → suggest Arabic
    return aiLanguage === "ar" ? "en" : "ar"; // fallback
  };

  const openAiTool = (
    tool: "thread" | "inspire" | "template" | "hook" | "cta" | "rewrite" | "translate" | "hashtags",
    tweetId?: string
  ) => {
    setAiTool(tool);
    setGeneratedHashtags([]);
    // Phase 0: Hook now targets active tweet (same as rewrite/hashtags)
    if ((tool === "rewrite" || tool === "hashtags" || tool === "hook") && tweetId) {
      setAiTargetTweetId(tweetId);
      const t = tweets.find((x) => x.id === tweetId);
      setAiRewriteText(t?.content || "");
      setAiTranslateTarget(aiLanguage === "ar" ? "en" : "ar");
    } else {
      setAiTargetTweetId(null);
      setAiRewriteText("");
      if (tool === "translate") {
        // P3-D: Smart default — infer best target language from first tweet's content
        const firstContent =
          tweets.find((t) => t.id === (tweetId ?? activeTweetId ?? tweets[0]?.id))?.content ??
          tweets[0]?.content ??
          "";
        setAiTranslateTarget(detectTranslateTarget(firstContent));
      } else {
        setAiTranslateTarget(aiLanguage === "ar" ? "en" : "ar");
      }
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

  // Phase 1: Inspiration handlers (moved from dialog to composer)
  const handleFetchInspiration = async () => {
    setIsLoadingInspiration(true);
    try {
      const res = await fetch(
        `/api/ai/inspiration?niche=${inspirationNiche}&language=${aiLanguage}`
      );
      if (res.status === 402) {
        openUpgradeModal({ feature: "ai_writer" });
        return;
      }
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setInspirationTopics(data.topics || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load inspiration topics");
    } finally {
      setIsLoadingInspiration(false);
    }
  };

  const handleInspirationSelect = (topic: string, hook: string) => {
    setAiTopic(topic);
    setAiHook(hook);
    setAiTool("thread"); // Switch to Write tab
    // User manually clicks Generate - no auto-fire
  };

  // Phase 2: Template handlers (moved from dialog to inline panel)
  const handleTemplateConfigSelect = (config: TemplatePromptConfig) => {
    setTemplateConfig(config);
    setAiTone(config.defaultTone);
    setTemplateFormat(config.defaultFormat);
    setAiTopic("");
    setAiTool("template"); // Switch to Template tab
    setIsAiOpen(true); // Ensure panel is open
  };

  const handleOpenTemplatesDialog = () => {
    // This is a no-op for now - the TemplatesDialog button opens itself
    // The dialog will call handleTemplateConfigSelect when a template is selected
  };

  const restoreHistory = (item: any) => {
    const content = item.outputContent;
    if (!content) return;

    if (item.type === "thread" && content.tweets) {
      setTweets(
        content.tweets.map((t: string) => ({
          id: Math.random().toString(36).substr(2, 9),
          content: t,
          media: [],
        }))
      );
      setIsAiOpen(false);
      toast.success("Restored thread from history");
    } else if (
      (item.type === "hook" || item.type === "rewrite" || item.type === "cta") &&
      content.text
    ) {
      if (aiTargetTweetId) {
        updateTweet(aiTargetTweetId, content.text);
      } else if (tweets[0]) {
        updateTweet(tweets[0].id, content.text);
      }
      setIsAiOpen(false);
      toast.success("Restored content from history");
    } else if (item.type === "translate" && content.tweets) {
      setTweets(
        content.tweets.map((t: string, idx: number) => ({
          ...(tweets[idx] || { id: Math.random().toString(36).substr(2, 9), media: [] }),
          content: t,
        }))
      );
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
    // C1: ask before overwriting existing content (threshold: 50+ chars)
    if (tweets.some((t) => t.content.trim().length > 50)) {
      setPendingTweets(newTweets);
      setConfirmOverwrite(true);
      return;
    }
    setTweets(newTweets);
    setPreviewIndex(0);
    toast.success("Template applied!");
  };

  const handleAiRun = async (overrides?: {
    topic?: string;
    hook?: string;
    skipOverwriteCheck?: boolean;
    skipTranslateCheck?: boolean;
  }) => {
    setIsGenerating(true);
    try {
      const runTopic = overrides?.topic ?? aiTopic;
      const runHook = overrides?.hook ?? aiHook;
      if (aiTool === "thread") {
        if (!runTopic) throw new Error("Topic is required");
        const isSinglePost = tweets.length === 1;

        // P2-F: Pre-check overwrite guard BEFORE starting API call
        // Show confirmation dialog if user has substantive content
        if (
          !isSinglePost &&
          !overrides?.skipOverwriteCheck &&
          tweets.some((t) => t.content.trim().length > 50)
        ) {
          preStreamTweetsRef.current = [...tweets];
          setPendingAiStreamGenerate(true);
          setConfirmOverwrite(true);
          setIsGenerating(false);
          return;
        }

        const res = await fetch("/api/ai/thread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: runTopic,
            tone: aiTone,
            tweetCount: aiCount[0],
            language: aiLanguage,
            mode: isSinglePost ? "single" : "thread",
            ...(isSinglePost ? { lengthOption: aiLengthOption } : {}),
            ...(isSinglePost && targetAccountIds[0]
              ? { targetAccountId: targetAccountIds[0] }
              : {}),
            ...(runHook ? { hook: runHook } : {}),
          }),
        });
        if (!res.ok) {
          if (res.status === 402) {
            await handlePlanLimit(res, "AI limit reached. Upgrade to continue.");
            return;
          } else if (res.status === 429) {
            const body = (await res.json().catch(() => ({}))) as { retryAfter?: number };
            const wait = body.retryAfter ? ` Try again in ${body.retryAfter}s.` : "";
            toast.error(`Rate limit reached.${wait}`);
          }
          throw new Error("Generation failed");
        }
        if (!res.body) throw new Error("No response body");

        if (isSinglePost) {
          // Single-post mode: plain text response (unchanged)
          const text = await res.text();
          if (!text || text.trim().length === 0) throw new Error("No content generated");

          // Phase 0: Save previous state for undo
          const previousTweets = structuredClone(tweets);

          const newTweet: TweetDraft = {
            id: tweets[0]?.id ?? Math.random().toString(36).substr(2, 9),
            content: text.trim(),
            media: tweets[0]?.media ?? [],
          };
          setTweets([newTweet]);
          setPreviewIndex(0);
          setIsAiOpen(false);
          // Phase 0: Undo toast for single post generation
          toast.success("Post generated!", {
            action: {
              label: "Undo",
              onClick: () => {
                setTweets(previousTweets);
                toast.info("Post restored");
              },
            },
            duration: 5000,
          });
          return;
        }

        // P2-F: Thread mode — stream each tweet directly into composer cards in real-time
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";
        let streamDone = false;

        // Start with empty cards — streaming will populate them one by one
        setTweets([]);
        setPreviewIndex(0);
        setStreamingTweetCount(0);

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
              if (event.done) {
                streamDone = true;
                break;
              }
              if (typeof event.tweet === "string" && event.tweet.length > 0) {
                // P2-F: Stream this tweet into composer immediately
                const newDraft: TweetDraft = {
                  id: Math.random().toString(36).substr(2, 9),
                  content: event.tweet,
                  media: [],
                };
                setTweets((prev) => {
                  const updated = [...prev, newDraft];
                  return aiAddNumbering ? applyNumbering(updated) : updated;
                });
                setStreamingTweetCount((c) => c + 1);
              }
            } catch {
              // partial line — skip
            }
          }
        }

        // Finalize — close panel after a brief delay so user sees the last card appear
        await new Promise((r) => setTimeout(r, 400));
        setIsAiOpen(false);
        const previousTweets = preStreamTweetsRef.current;
        preStreamTweetsRef.current = null;
        // Phase 3: Standardized toast messages
        toast.success("AI Writer: Thread generated!", {
          action: previousTweets
            ? {
                label: "Undo",
                onClick: () => {
                  setTweets(previousTweets);
                  toast.info("Thread restored");
                },
              }
            : undefined,
          duration: 5000,
        });
        return;
      }

      // Phase 2: Template generation — uses same SSE streaming pattern as thread
      if (aiTool === "template") {
        if (!templateConfig) {
          toast.error("Please select a template first");
          return;
        }
        if (!aiTopic || aiTopic.trim().length < 3) {
          toast.error("Topic must be at least 3 characters");
          return;
        }

        // Pre-check overwrite guard
        if (!overrides?.skipOverwriteCheck && tweets.some((t) => t.content.trim().length > 50)) {
          preStreamTweetsRef.current = [...tweets];
          setPendingAiStreamGenerate(true);
          setConfirmOverwrite(true);
          setIsGenerating(false);
          return;
        }

        const res = await fetch("/api/ai/template-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: templateConfig.id,
            topic: aiTopic.trim(),
            tone: aiTone,
            language: aiLanguage,
            outputFormat: templateFormat,
          }),
        });

        if (!res.ok) {
          if (res.status === 402) {
            await handlePlanLimit(res, "AI limit reached. Upgrade to continue.");
            return;
          } else if (res.status === 429) {
            const body = (await res.json().catch(() => ({}))) as { retryAfter?: number };
            const wait = body.retryAfter ? ` Try again in ${body.retryAfter}s.` : "";
            toast.error(`Rate limit reached.${wait}`);
            return;
          }
          throw new Error("Template generation failed");
        }

        if (!res.body) throw new Error("No response body");

        // Stream tweets using same pattern as thread
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";
        let streamDone = false;

        setTweets([]);
        setPreviewIndex(0);
        setStreamingTweetCount(0);

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
              if (event.done) {
                streamDone = true;
                break;
              }
              if (typeof event.tweet === "string" && event.tweet.length > 0) {
                const newDraft: TweetDraft = {
                  id: Math.random().toString(36).substr(2, 9),
                  content: event.tweet,
                  media: [],
                };
                setTweets((prev) => {
                  const updated = [...prev, newDraft];
                  return aiAddNumbering ? applyNumbering(updated) : updated;
                });
                setStreamingTweetCount((c) => c + 1);
              }
            } catch {
              // partial line — skip
            }
          }
        }

        await new Promise((r) => setTimeout(r, 400));
        setIsAiOpen(false);
        const previousTweets = preStreamTweetsRef.current;
        preStreamTweetsRef.current = null;

        // Store AI meta for saving as template later
        const templateAiMeta: TemplateAiMeta = {
          templateId: templateConfig.id,
          tone: aiTone,
          language: aiLanguage,
          outputFormat: templateFormat,
        };
        setLastTemplateAiMeta(templateAiMeta);

        // Phase 3: Standardized toast messages
        toast.success("Template: Content generated!", {
          action: previousTweets
            ? {
                label: "Undo",
                onClick: () => {
                  setTweets(previousTweets);
                  toast.info("Content restored");
                },
              }
            : undefined,
          duration: 5000,
        });
        return;
      }

      if (aiTool === "hook") {
        // Phase 0: Hook targets active tweet, not always tweet[0]
        const targetTweet = aiTargetTweetId
          ? tweets.find((t) => t.id === aiTargetTweetId)
          : tweets[0];
        if (!targetTweet) throw new Error("No tweet to update");

        // Phase 0: Overwrite guard for Hook
        if (targetTweet.content.trim().length > 50) {
          previousTweetsRef.current = structuredClone(tweets);
        }

        const res = await fetch("/api/ai/tools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool: "hook",
            topic: aiTopic || targetTweet.content || "",
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
        updateTweet(targetTweet.id, data.text);
        setIsAiOpen(false);
        // Phase 3: Standardized toast messages
        toast.success("Hook: Opening line generated!", {
          action: previousTweetsRef.current
            ? {
                label: "Undo",
                onClick: () => {
                  if (previousTweetsRef.current) {
                    setTweets(previousTweetsRef.current);
                    previousTweetsRef.current = null;
                    toast.info("Changes undone");
                  }
                },
              }
            : undefined,
          duration: 5000,
        });
        return;
      }

      if (aiTool === "cta") {
        // Phase 2: CTA now has access to thread context for better relevance
        const threadContext = tweets
          .map((t) => t.content)
          .filter(Boolean)
          .join(" ")
          .slice(0, 500);
        const res = await fetch("/api/ai/tools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool: "cta",
            tone: aiTone,
            language: aiLanguage,
            context: threadContext || undefined,
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
        // Phase 3: Standardized toast messages
        toast.success("CTA: Call-to-action added!");
        return;
      }

      if (aiTool === "translate") {
        const nonEmptyTweets = tweets.filter((t) => t.content.trim());
        if (nonEmptyTweets.length === 0) {
          toast.error("Please add some content to translate");
          return;
        }

        // Phase 0: Show confirmation dialog before translating
        if (!overrides?.skipTranslateCheck) {
          setConfirmTranslate(true);
          setIsGenerating(false);
          return;
        }

        // Phase 0: Save state for undo before translating
        previousTweetsRef.current = structuredClone(tweets);

        const res = await fetch("/api/ai/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tweets: nonEmptyTweets.map((t) => t.content),
            targetLanguage: aiTranslateTarget,
          }),
        });
        if (!res.ok) {
          if (res.status === 402) {
            await handlePlanLimit(res, "AI limit reached. Upgrade to continue.");
            return;
          }
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Translation failed");
        }
        const data = await res.json();
        let translatedIdx = 0;
        const next = tweets.map((t) => {
          if (!t.content.trim()) return t;
          const translated = data.tweets?.[translatedIdx++];
          return translated ? { ...t, content: translated } : t;
        });
        setTweets(next);
        setIsAiOpen(false);
        // Phase 3: Standardized toast messages
        const translatedCount = nonEmptyTweets.length;
        toast.success(
          `Translate: ${translatedCount} tweet${translatedCount !== 1 ? "s" : ""} translated!`,
          {
            action: {
              label: "Undo",
              onClick: () => {
                if (previousTweetsRef.current) {
                  setTweets(previousTweetsRef.current);
                  previousTweetsRef.current = null;
                  toast.info("Translation undone");
                }
              },
            },
            duration: 5000,
          }
        );
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
        // Phase 3: Keep panel open - hashtags appear as inline chips in panel
        toast.success(`Hashtags: ${data.hashtags?.length || 0} tags generated -- click to add`);
        return;
      }

      // Phase 0: Rewrite branch (note: this is the "rewrite" tool, distinct from hook/cta)
      const targetId = aiTargetTweetId;
      if (!targetId) throw new Error("No tweet selected");

      // Phase 0: Save previous content for undo
      const targetTweet = tweets.find((t) => t.id === targetId);
      if (targetTweet?.content) {
        previousTweetsRef.current = structuredClone(tweets);
      }

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
      // Phase 3: Standardized toast messages
      toast.success("Rewrite: Tweet rewritten!", {
        action: {
          label: "Undo",
          onClick: () => {
            if (previousTweetsRef.current) {
              setTweets(previousTweetsRef.current);
              previousTweetsRef.current = null;
              toast.info("Rewrite undone");
            }
          },
        },
        duration: 5000,
      });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "AI request failed");
    } finally {
      setIsGenerating(false);
      setAiHook("");
    }
  };

  // NOTE: generatedHashtags is cleared at the start of every openAiTool() call.
  // A useEffect that cleared them on panel close was removed here because it
  // ran synchronously in the same render batch as setIsAiOpen(false) in the
  // hashtags branch — wiping chips before they ever rendered.

  // Phase 1: Removed auto-fire useEffect - Inspiration now pre-fills topic but user clicks Generate manually

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
      fileType: (file.type.startsWith("video/")
        ? "video"
        : file.type === "image/gif"
          ? "gif"
          : "image") as "image" | "video" | "gif",
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
                      ? {
                          url: data.url,
                          mimeType: data.mimeType,
                          fileType: data.fileType,
                          size: data.size,
                        }
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
            t.id === tweetId
              ? { ...t, media: t.media.filter((m) => m.placeholderId !== placeholderId) }
              : t
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

  const hasContent = tweets.every((t) => t.content.trim().length > 0);

  const handleSubmit = async (action: "draft" | "schedule" | "publish_now") => {
    const isUploading = tweets.some((t) => t.media.some((m) => m.uploading));
    if (isUploading) {
      toast.error("Please wait for all media to finish uploading.");
      return;
    }

    // Validate that every tweet has content (API rejects empty strings)
    const emptyIndex = tweets.findIndex((t) => !t.content.trim());
    if (emptyIndex !== -1) {
      const label =
        tweets.length > 1 ? `Tweet ${emptyIndex + 1} is empty.` : "Tweet content cannot be empty.";
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
            tweets: tweets.map((t) => ({
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
            tweets: tweets.map((t) => ({
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
          message =
            count > 1
              ? `${count} posts sent to queue — publishing shortly.`
              : "Post sent to queue — publishing shortly.";
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

  const selectedAccount = accounts.find((a) => targetAccountIds.includes(a.id)) || accounts[0];
  const userImage = mounted ? selectedAccount?.avatarUrl || session?.user?.image : null;
  const userName = mounted
    ? selectedAccount?.displayName || session?.user?.name || "User Name"
    : "User Name";
  const userHandle = mounted
    ? selectedAccount?.username
      ? `@${selectedAccount.username}`
      : session?.user?.email
        ? `@${session.user.email.split("@")[0]}`
        : "@handle"
    : "@handle";
  const selectedTier: XSubscriptionTier | undefined =
    selectedAccount?.platform === "twitter" ? selectedAccount.xSubscriptionTier : undefined;

  // Multi-account mixed tier: apply the most restrictive tier among selected X accounts
  const selectedXAccounts = accounts.filter(
    (a) => targetAccountIds.includes(a.id) && a.platform === "twitter"
  );
  const effectiveTier: XSubscriptionTier | undefined = (() => {
    if (selectedXAccounts.length === 0) return selectedTier;
    const tiers = selectedXAccounts.map(
      (a) => a.xSubscriptionTier as XSubscriptionTier | undefined
    );
    // If any selected account is Free (None/null), treat the whole group as Free
    if (tiers.some((t) => !canPostLongContent(t))) return undefined;
    return selectedTier;
  })();
  const hasMixedTiers =
    selectedXAccounts.length > 1 &&
    !selectedXAccounts.every(
      (a) => a.xSubscriptionTier === selectedXAccounts[0]?.xSubscriptionTier
    );

  // Preview carousel — computed after all state declarations (H6)
  const safePreviewIndex = Math.min(previewIndex, tweets.length - 1);
  const previewTweet = tweets[safePreviewIndex];

  const isAiGenerateDisabled =
    isGenerating ||
    (aiTool === "thread" && !aiTopic) ||
    (aiTool === "hook" && !aiTopic && !(tweets[0]?.content || "").trim()) ||
    (aiTool === "rewrite" && !aiRewriteText.trim()) ||
    (aiTool === "translate" && !tweets.some((t) => t.content.trim())) ||
    (aiTool === "hashtags" &&
      !(tweets.find((t) => t.id === aiTargetTweetId)?.content ?? "").trim());

  // P3-C: Global keyboard shortcuts — must be called after handleSubmit is declared
  useKeyboardShortcuts([
    {
      key: "Enter",
      metaOrCtrl: true,
      label: "⌘↵ Publish",
      handler: () => {
        if (hasContent && !isSubmitting) handleSubmit(scheduledDate ? "schedule" : "publish_now");
      },
    },
    {
      key: "d",
      metaOrCtrl: true,
      label: "⌘D Draft",
      handler: () => {
        if (hasContent && !isSubmitting) handleSubmit("draft");
      },
    },
    {
      key: "k",
      metaOrCtrl: true,
      label: "⌘K AI",
      handler: () => {
        if (!isAiOpen) openAiTool("thread");
        else setIsAiOpen(false);
      },
    },
    // Phase 4: Keyboard shortcuts for AI tools
    {
      key: "w",
      metaOrCtrl: true,
      shift: true,
      label: "⌘⇧W Write",
      handler: () => {
        openAiTool("thread");
      },
    },
    {
      key: "i",
      metaOrCtrl: true,
      shift: true,
      label: "⌘⇧I Inspire",
      handler: () => {
        openAiTool("inspire");
      },
    },
    {
      key: "t",
      metaOrCtrl: true,
      shift: true,
      label: "⌘⇧T Translate",
      handler: () => {
        openAiTool("translate");
      },
    },
    {
      key: "h",
      metaOrCtrl: true,
      shift: true,
      label: "⌘⇧H Hashtags",
      handler: () => {
        openAiTool("hashtags");
      },
    },
  ]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
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
      <div className="space-y-3 sm:space-y-4 lg:col-span-2">
        {/* P3-E: First-time composer hint overlay */}
        <ComposerOnboardingHint />
        {/* W4: Inspiration attribution banner */}
        {sourceAttribution && (
          <div className="border-border/50 bg-muted/30 flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
              Inspired by{" "}
              <a
                href={sourceAttribution.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground font-medium hover:underline"
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
              <XIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
          </div>
        )}

        {/* W5: Calendar metadata hint banner */}
        {calendarMeta && (calendarMeta.tone || calendarMeta.topic) && (
          <div className="border-border/50 bg-muted/30 flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm">
            <span className="text-muted-foreground flex flex-wrap items-center gap-1.5 sm:gap-2">
              <CalendarDays className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
              {calendarMeta.topic && (
                <span>
                  Topic: <span className="text-foreground font-medium">{calendarMeta.topic}</span>
                </span>
              )}
              {calendarMeta.topic && calendarMeta.tone && (
                <span className="text-border/60 hidden sm:inline">·</span>
              )}
              {calendarMeta.tone && (
                <span>
                  Tone:{" "}
                  <span className="text-foreground font-medium capitalize">
                    {calendarMeta.tone}
                  </span>
                </span>
              )}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => setCalendarMeta(null)}
              aria-label="Dismiss calendar hint"
            >
              <XIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
          </div>
        )}

        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={tweets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {tweets.map((tweet, index) => {
              // Phase 3: Compute isAiTarget based on aiTool
              const isAiTarget = (() => {
                if (!isAiOpen) return false;
                if (aiTool === "thread" || aiTool === "inspire" || aiTool === "template")
                  return true;
                if (aiTool === "hook" || aiTool === "rewrite" || aiTool === "hashtags")
                  return tweet.id === aiTargetTweetId;
                if (aiTool === "cta") return index === tweets.length - 1;
                if (aiTool === "translate") return tweet.content.trim().length > 0;
                return false;
              })();

              return (
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
                  openAiImage={openAiImageDialog}
                  onMove={moveTweet}
                  onClearTweet={() => clearTweet(tweet.id)}
                  tier={effectiveTier}
                  isAiTarget={isAiTarget}
                  selectedTier={effectiveTier}
                  {...(index === 0 && { onConvertToThread: addTweet })}
                  {...(tweet.id === aiTargetTweetId &&
                    generatedHashtags.length > 0 && {
                      suggestedHashtags: generatedHashtags,
                      onHashtagClick: (tag: string) => {
                        updateTweet(tweet.id, `${tweet.content} ${tag}`.trim());
                        setGeneratedHashtags((prev) => prev.filter((t) => t !== tag));
                      },
                    })}
                />
              );
            })}
          </SortableContext>
        </DndContext>

        {tweets.some((t) => t.content.length > 280) &&
          canPostLongContent(effectiveTier) &&
          effectiveTier && (
            <Alert className="border-success/40 bg-success/5 text-success dark:text-success">
              <CheckCircle2 className="text-success h-4 w-4" />
              <AlertDescription className="text-success flex items-center gap-2">
                <XSubscriptionBadge tier={effectiveTier} size="md" />
                <span>
                  Your account ({userHandle}) supports long posts — this will publish normally with
                  up to 2,000 characters.
                </span>
              </AlertDescription>
            </Alert>
          )}

        {tweets.some((t) => t.content.length > 280) && !canPostLongContent(effectiveTier) && (
          <Alert className="border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400">
            <Info className="h-4 w-4 text-amber-500" />
            <AlertDescription className="space-y-1 text-amber-700 dark:text-amber-400">
              <p>
                <span className="font-medium">X Premium required for long posts.</span>
              </p>
              <p>
                One or more of your tweets exceeds 280 characters. Standard X accounts are limited
                to 280 characters per tweet — posts beyond this limit will only publish successfully
                on <span className="font-medium">X Premium</span> accounts. If you&apos;re on a
                standard account, these tweets will fail and appear as errors in your queue.
              </p>
              <p className="text-amber-600/80 dark:text-amber-400/80">
                Tip: Use the &quot;Convert to Thread&quot; button below to split your content into
                multiple tweets under 280 characters each.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Premium soft warning: single post exceeds 2,000 chars */}
        {tweets.length === 1 &&
          tweets[0]!.content.length > 2000 &&
          canPostLongContent(effectiveTier) &&
          effectiveTier && (
            <Alert className="border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400">
              <Info className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                <span className="font-medium">Post exceeds 2,000 characters.</span> While your X
                Premium account supports up to 25,000 characters, posts beyond 2,000 characters tend
                to see significantly lower engagement. Consider trimming your content or converting
                to a thread.
              </AlertDescription>
            </Alert>
          )}

        {/* Mixed tier note: accounts have different subscription levels */}
        {hasMixedTiers && (
          <div className="border-border/50 bg-muted/30 text-muted-foreground flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs">
            <Info className="h-3 w-3 shrink-0" />
            <span>
              Character limit set to 280 based on the most restrictive account. To use longer posts,
              remove free-tier accounts or post separately.
            </span>
          </div>
        )}

        {lastSavedAt && showSavedLabel && (
          <div className="text-muted-foreground/60 flex items-center justify-end gap-1 px-1 text-xs">
            <Clock className="h-3 w-3" />
            <span>Auto-saved · {formatTimeAgo(lastSavedAt)}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="flex-1 border-dashed py-4 text-sm sm:py-6 sm:text-base"
            onClick={addTweet}
          >
            <Plus className="mr-1.5 h-4 w-4 sm:mr-2" />
            {tweets.length === 1 ? "Convert to Thread" : "Add to Thread"}
          </Button>
          {/* P3-B: Auto-numbering status chip — visible when thread has 3+ tweets */}
          {tweets.length >= 3 && (
            <Button
              variant={aiAddNumbering ? "secondary" : "ghost"}
              size="sm"
              className="h-9 shrink-0 gap-1 text-xs sm:h-9"
              onClick={() => {
                const next = !aiAddNumbering;
                setAiAddNumbering(next);
                setTweets(next ? applyNumbering([...tweets]) : removeNumbering([...tweets]));
              }}
              title={
                aiAddNumbering
                  ? "Auto-numbering on — click to disable"
                  : "Auto-numbering off — click to enable"
              }
            >
              <ListOrdered className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{aiAddNumbering ? "1/N on" : "1/N off"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Sidebar Column */}
      <div className="space-y-3 sm:space-y-4">
        {/* B1: Preview section moved to top of sidebar */}
        <Card>
          <CardContent className="space-y-2 px-3 pt-3 sm:space-y-3 sm:px-6 sm:pt-5">
            <div className="mb-1.5 flex items-center justify-between sm:mb-2">
              <p className="text-muted-foreground/70 text-xs font-medium">Preview</p>
              <div className="flex items-center gap-1">
                {tweets.length > 1 && <ViralScoreBadge content={tweets[0]?.content || ""} />}
                {tweets.length <= 1 && <ViralScoreBadge content={previewTweet?.content || ""} />}
              </div>
            </div>
            <div
              className={cn(
                "bg-background rounded-md border p-3 sm:p-4",
                tweets.length > 1 && "max-h-[300px] overflow-y-auto sm:max-h-[400px]"
              )}
            >
              {tweets.length <= 1 ? (
                /* Single tweet preview */
                <div className="flex gap-2 sm:gap-3">
                  <div className="bg-muted relative h-8 w-8 shrink-0 overflow-hidden rounded-full sm:h-10 sm:w-10">
                    {userImage ? (
                      <Image
                        src={userImage}
                        alt={userName}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="bg-primary text-primary-foreground flex h-full w-full items-center justify-center font-bold">
                        {userName[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                  <div className="w-full min-w-0 space-y-0.5 sm:space-y-1">
                    <div className="flex flex-col gap-0 text-xs sm:text-sm xl:flex-row xl:items-center xl:gap-1">
                      <span className="truncate font-bold">{userName}</span>
                      <span className="text-muted-foreground truncate">{userHandle}</span>
                    </div>
                    <p className="text-xs break-words whitespace-pre-wrap sm:text-sm">
                      {previewTweet?.content || "Preview text will appear here..."}
                    </p>
                    {(previewTweet?.media?.length || 0) > 0 && previewTweet?.media?.[0]?.url && (
                      <div className="mt-2 overflow-hidden rounded-lg border">
                        {previewTweet?.media?.[0]?.fileType === "video" &&
                        !previewTweet.media[0].url.match(/\.(jpg|jpeg|png|webp)(\?.*)?$/i) ? (
                          <video
                            src={previewTweet.media[0].url}
                            className="h-auto w-full"
                            controls
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            crossOrigin="anonymous"
                          >
                            Your browser does not support the video tag.
                          </video>
                        ) : (
                          <Image
                            src={previewTweet.media[0].url}
                            alt="Preview"
                            width={600}
                            height={400}
                            className="h-auto w-full"
                          />
                        )}
                      </div>
                    )}
                    {previewTweet?.linkPreview && !previewTweet.media.length && (
                      <div className="mt-2 overflow-hidden rounded-md border">
                        {previewTweet.linkPreview.images?.[0] && (
                          <div className="relative h-48 w-full">
                            <Image
                              src={previewTweet.linkPreview.images[0]}
                              alt="Preview"
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="bg-muted/20 p-3">
                          <h4 className="line-clamp-1 text-sm font-medium">
                            {previewTweet.linkPreview.title}
                          </h4>
                          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                            {previewTweet.linkPreview.description}
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs lowercase">
                            {new URL(previewTweet.linkPreview.url).hostname}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Thread preview — all tweets stacked with connecting lines */
                tweets.map((t, i) => (
                  <div key={t.id}>
                    {i > 0 && <div className="bg-muted-foreground/30 mx-auto h-3 w-0.5 sm:h-4" />}
                    <div className="flex gap-2 sm:gap-3">
                      <div className="bg-muted relative h-8 w-8 shrink-0 overflow-hidden rounded-full sm:h-10 sm:w-10">
                        {userImage ? (
                          <Image
                            src={userImage}
                            alt={userName}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="bg-primary text-primary-foreground flex h-full w-full items-center justify-center font-bold">
                            {userName[0]?.toUpperCase() || "U"}
                          </div>
                        )}
                      </div>
                      <div className="w-full min-w-0 space-y-0.5 sm:space-y-1">
                        <div className="flex flex-col gap-0 text-xs sm:text-sm xl:flex-row xl:items-center xl:gap-1">
                          <span className="truncate font-bold">{userName}</span>
                          <div className="flex min-w-0 items-center gap-1">
                            <span className="text-muted-foreground truncate">{userHandle}</span>
                            {tweets.length > 1 && (
                              <span className="text-muted-foreground/60 shrink-0 text-[10px] sm:text-xs">
                                {i + 1}/{tweets.length}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs break-words whitespace-pre-wrap sm:text-sm">
                          {t.content || "..."}
                        </p>
                        {t.media?.length > 0 && t.media?.[0]?.url && (
                          <div className="mt-2 overflow-hidden rounded-lg border">
                            {t.media[0].fileType === "video" &&
                            !t.media[0].url.match(/\.(jpg|jpeg|png|webp)(\?.*)?$/i) ? (
                              <video
                                src={t.media[0].url}
                                className="h-auto w-full"
                                controls
                                autoPlay
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                crossOrigin="anonymous"
                              >
                                Your browser does not support the video tag.
                              </video>
                            ) : (
                              <Image
                                src={t.media[0].url}
                                alt="Preview"
                                width={600}
                                height={400}
                                className="h-auto w-full"
                              />
                            )}
                          </div>
                        )}
                        {t.linkPreview && !t.media?.length && (
                          <div className="mt-2 overflow-hidden rounded-md border">
                            {t.linkPreview.images?.[0] && (
                              <div className="relative h-48 w-full">
                                <Image
                                  src={t.linkPreview.images[0]}
                                  alt="Preview"
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <div className="bg-muted/20 p-3">
                              <h4 className="line-clamp-1 text-sm font-medium">
                                {t.linkPreview.title}
                              </h4>
                              <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                                {t.linkPreview.description}
                              </p>
                              <p className="text-muted-foreground mt-1 text-xs lowercase">
                                {new URL(t.linkPreview.url).hostname}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 1: Content Tools — always visible; AI panel expands inline on desktop (P1-B) */}
        <Card>
          <CardContent className="space-y-2 px-3 pt-3 sm:space-y-3 sm:px-6 sm:pt-5">
            <p className="text-muted-foreground/70 text-xs font-medium">Content Tools</p>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 lg:grid-cols-2 xl:grid-cols-3">
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-full justify-center gap-1 text-xs sm:h-9 sm:gap-1.5"
                onClick={() => openAiTool("thread")}
              >
                <Sparkles className="text-primary h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Writer</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-full justify-center gap-1 text-xs sm:h-9 sm:gap-1.5"
                onClick={() => openAiTool("inspire")}
              >
                <Lightbulb className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
                <span className="truncate">Inspire</span>
              </Button>
              <Suspense
                fallback={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-full justify-center gap-1 text-xs sm:h-9 sm:gap-1.5"
                    disabled
                  >
                    <span className="truncate">Templates</span>
                  </Button>
                }
              >
                <TemplatesDialog
                  onSelect={(tweets, aiMeta) => handleTemplateSelect(tweets, aiMeta)}
                  onTemplateSelect={handleTemplateConfigSelect}
                />
              </Suspense>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-full justify-center gap-1 text-xs sm:h-9 sm:gap-1.5"
                onClick={() => openAiTool("hook", activeTweetId ?? tweets[0]?.id)}
              >
                <Zap className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Hook</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-full justify-center gap-1 text-xs sm:h-9 sm:gap-1.5"
                onClick={() => openAiTool("cta")}
              >
                <Megaphone className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">CTA</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-full justify-center gap-1 text-xs sm:h-9 sm:gap-1.5"
                onClick={() => openAiTool("translate")}
              >
                <Globe className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Translate</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="col-span-2 h-9 w-full justify-center gap-1 text-xs sm:h-9 sm:gap-1.5 lg:col-span-2 xl:col-span-1"
                onClick={() => openAiTool("hashtags", activeTweetId ?? tweets[0]?.id)}
              >
                <Hash className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">#Tags</span>
              </Button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5 border-t pt-2 sm:mt-2 sm:gap-2 sm:pt-2">
              <Button
                variant={isTweetsNumbered ? "secondary" : "ghost"}
                size="sm"
                className="text-muted-foreground h-9 w-full justify-center gap-1 text-xs whitespace-nowrap sm:h-9 sm:gap-1.5"
                onClick={() =>
                  setTweets(
                    isTweetsNumbered ? removeNumbering([...tweets]) : applyNumbering([...tweets])
                  )
                }
              >
                <ListOrdered className="h-3.5 w-3.5 shrink-0" />
                <span>{isTweetsNumbered ? "Remove 1/N" : "Number 1/N"}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-muted-foreground hover:text-foreground h-9 w-full justify-center gap-1 text-xs whitespace-nowrap sm:h-9 sm:gap-1.5"
                onClick={() => setIsSaveTemplateOpen(true)}
                disabled={isSubmitting}
              >
                <BookmarkPlus className="h-3.5 w-3.5 shrink-0" />
                <span>Save Template</span>
              </Button>
            </div>
            {/* P1-B/C: Inline AI panel expands here on desktop when open */}
            {isAiOpen && isDesktop && (
              <div className="border-t pt-2">
                <AiToolsPanel
                  aiTool={aiTool}
                  onToolChange={(tool) => {
                    setAiTool(tool);
                    setGeneratedHashtags([]);
                    if (tool === "hashtags") {
                      setAiTargetTweetId(activeTweetId ?? tweets[0]?.id ?? null);
                    }
                  }}
                  aiTopic={aiTopic}
                  onTopicChange={setAiTopic}
                  aiTone={aiTone}
                  onToneChange={setAiTone}
                  aiLanguage={aiLanguage}
                  onLanguageChange={setAiLanguage}
                  aiCount={aiCount}
                  onCountChange={setAiCount}
                  aiAddNumbering={aiAddNumbering}
                  onAddNumberingChange={setAiAddNumbering}
                  aiLengthOption={aiLengthOption}
                  onLengthOptionChange={setAiLengthOption}
                  selectedTier={selectedTier ?? null}
                  tweets={tweets}
                  aiRewriteText={aiRewriteText}
                  onRewriteTextChange={setAiRewriteText}
                  aiTranslateTarget={aiTranslateTarget}
                  onTranslateTargetChange={setAiTranslateTarget}
                  aiTargetTweetId={aiTargetTweetId}
                  isGenerating={isGenerating}
                  streamingTweetCount={streamingTweetCount}
                  {...(typeof aiCount[0] === "number" && { totalTweetCount: aiCount[0] })}
                  onGenerate={handleAiRun}
                  onClose={() => setIsAiOpen(false)}
                  // Phase 1: Inspiration props
                  inspirationTopics={inspirationTopics}
                  inspirationNiche={inspirationNiche}
                  isLoadingInspiration={isLoadingInspiration}
                  onInspirationNicheChange={setInspirationNiche}
                  onFetchInspiration={handleFetchInspiration}
                  onInspirationSelect={handleInspirationSelect}
                  // Phase 2: Template props
                  templateConfig={templateConfig}
                  templateFormat={templateFormat}
                  onTemplateFormatChange={setTemplateFormat}
                  onOpenTemplatesDialog={handleOpenTemplatesDialog}
                  // Phase 3: Hashtag chips props
                  generatedHashtags={generatedHashtags}
                  onHashtagClick={(tag) => {
                    const targetId = aiTargetTweetId ?? activeTweetId ?? tweets[0]?.id;
                    if (targetId) {
                      const tweet = tweets.find((t) => t.id === targetId);
                      if (tweet) {
                        updateTweet(targetId, `${tweet.content} ${tag}`.trim());
                        setGeneratedHashtags((prev) => prev.filter((t) => t !== tag));
                      }
                    }
                  }}
                  onHashtagsDone={() => setGeneratedHashtags([])}
                  isAiOpen={isAiOpen}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Publishing (H1 — split from content tools) */}
        <Card>
          <CardContent className="space-y-3 px-3 pt-3 sm:space-y-4 sm:px-6 sm:pt-5">
            <p className="text-muted-foreground/70 text-xs font-medium">Publishing</p>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="post-accounts" className="text-xs sm:text-sm">
                Post to accounts
              </Label>
              <TargetAccountsSelect
                value={targetAccountIds}
                onChange={setTargetAccountIds}
                accounts={accounts}
                loading={accountsLoading}
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="schedule-date" className="text-xs sm:text-sm">
                Schedule for
              </Label>
              <div className="bg-muted/30 space-y-1.5 rounded-lg p-2 sm:space-y-2 sm:p-3">
                <DateTimePicker
                  id="schedule-date"
                  value={scheduledDate}
                  onChange={(val) => {
                    if (!val) {
                      setScheduledDate("");
                      setRecurrencePattern("none");
                      setRecurrenceEndDate("");
                    } else {
                      setScheduledDate(val);
                    }
                  }}
                />
                <BestTimeSuggestions onSelect={setScheduledDate} hideHeader />
              </div>
              {browserTimezone && (
                <p className="text-muted-foreground/60 text-[10px] sm:text-xs">
                  Times are in{" "}
                  <span className="text-foreground font-medium">{browserTimezone}</span>{" "}
                  <span className="tabular-nums">
                    (UTC
                    {(() => {
                      const off = -new Date().getTimezoneOffset();
                      const h = Math.floor(Math.abs(off) / 60);
                      const m = Math.abs(off) % 60;
                      return `${off >= 0 ? "+" : "-"}${h}${m > 0 ? `:${String(m).padStart(2, "0")}` : ""}`;
                    })()}
                    )
                  </span>
                </p>
              )}

              {scheduledDate && (
                <div className="grid grid-cols-1 gap-2 pt-1.5 sm:grid-cols-2 sm:pt-2">
                  <div className="space-y-1">
                    <label className="text-muted-foreground text-xs font-medium">Repeat</label>
                    <Select value={recurrencePattern} onValueChange={setRecurrencePattern}>
                      <SelectTrigger className="h-8 sm:h-9">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
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
                      <label className="text-muted-foreground text-xs font-medium">End Date</label>
                      <DatePicker
                        className="h-8 sm:h-9"
                        value={recurrenceEndDate}
                        onChange={setRecurrenceEndDate}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* H2: Action context — shows what will happen before the user clicks */}
            <p className="text-muted-foreground text-center text-[10px] sm:text-xs">
              {scheduledDate ? (
                <>
                  Scheduling for{" "}
                  <span className="text-foreground font-medium">
                    {new Date(scheduledDate).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                    {" at "}
                    {new Date(scheduledDate).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </>
              ) : (
                <>
                  Posting immediately to{" "}
                  <span className="text-foreground font-medium">
                    {accounts.find((a) => targetAccountIds.includes(a.id))?.username
                      ? `@${accounts.find((a) => targetAccountIds.includes(a.id))?.username}`
                      : "selected account"}
                  </span>
                </>
              )}
            </p>

            <div className="flex flex-col gap-1.5 sm:gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button
                        className="h-10 w-full text-sm font-semibold sm:h-11 sm:text-base"
                        onClick={() => handleSubmit(scheduledDate ? "schedule" : "publish_now")}
                        disabled={isSubmitting || !hasContent}
                      >
                        {isSubmitting ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin sm:mr-2 sm:h-4 sm:w-4" />
                        ) : (
                          <Send className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                        )}
                        Post to X
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!hasContent && <TooltipContent>Add content to enable</TooltipContent>}
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button
                        variant="outline"
                        className="h-9 w-full text-sm sm:h-10"
                        onClick={() => handleSubmit("draft")}
                        disabled={isSubmitting || !hasContent}
                      >
                        <FileText className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                        Save as Draft
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!hasContent && <TooltipContent>Add content to enable</TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>

        {/* Save Template Dialog */}
        <Dialog
          open={isSaveTemplateOpen}
          onOpenChange={(v) => {
            setIsSaveTemplateOpen(v);
            if (!v) {
              setTemplateTitle("");
              setTemplateDescription("");
              setTemplateCategory("Personal");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save as Template</DialogTitle>
              <DialogDescription>
                Save your current thread structure as a reusable template.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  placeholder="My Awesome Template"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
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
              {lastTemplateAiMeta && (
                <div className="border-primary/20 bg-primary/5 text-muted-foreground space-y-0.5 rounded-md border px-3 py-2 text-xs">
                  <p className="text-foreground flex items-center gap-1 font-medium">
                    <Sparkles className="text-primary h-3 w-3" />
                    AI parameters will be saved
                  </p>
                  <p>
                    Tone:{" "}
                    <span className="text-foreground capitalize">{lastTemplateAiMeta.tone}</span>
                  </p>
                  <p>
                    Language:{" "}
                    <span className="text-foreground">
                      {LANGUAGES.find((l) => l.code === lastTemplateAiMeta.language)?.label ??
                        lastTemplateAiMeta.language}
                    </span>
                  </p>
                  <p>
                    Format:{" "}
                    <span className="text-foreground capitalize">
                      {lastTemplateAiMeta.outputFormat.replace("-", " ")}
                    </span>
                  </p>
                  <p className="text-muted-foreground/70 pt-0.5">
                    You can re-generate this content from My Templates.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSaveTemplateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate} disabled={!templateTitle.trim() || isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {/* Mobile AI panel — Sheet (P1-B: desktop uses inline accordion above) */}
      {!isDesktop && (
        <Sheet open={isAiOpen} onOpenChange={setIsAiOpen}>
          <SheetContent
            side="bottom"
            className="pb-safe flex h-[80dvh] flex-col gap-0 overflow-hidden px-0 sm:h-[60dvh]"
          >
            <SheetHeader className="shrink-0 px-4 pb-2 sm:px-6">
              <SheetTitle>AI Tools</SheetTitle>
              <SheetDescription>Generate content with AI assistance</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 py-2 sm:px-6">
              <AiToolsPanel
                aiTool={aiTool}
                onToolChange={(tool) => {
                  setAiTool(tool);
                  setGeneratedHashtags([]);
                  if (tool === "hashtags") {
                    setAiTargetTweetId(activeTweetId ?? tweets[0]?.id ?? null);
                  }
                }}
                aiTopic={aiTopic}
                onTopicChange={setAiTopic}
                aiTone={aiTone}
                onToneChange={setAiTone}
                aiLanguage={aiLanguage}
                onLanguageChange={setAiLanguage}
                aiCount={aiCount}
                onCountChange={setAiCount}
                aiAddNumbering={aiAddNumbering}
                onAddNumberingChange={setAiAddNumbering}
                aiLengthOption={aiLengthOption}
                onLengthOptionChange={setAiLengthOption}
                selectedTier={selectedTier ?? null}
                tweets={tweets}
                aiRewriteText={aiRewriteText}
                onRewriteTextChange={setAiRewriteText}
                aiTranslateTarget={aiTranslateTarget}
                onTranslateTargetChange={setAiTranslateTarget}
                aiTargetTweetId={aiTargetTweetId}
                isGenerating={isGenerating}
                streamingTweetCount={streamingTweetCount}
                {...(typeof aiCount[0] === "number" && { totalTweetCount: aiCount[0] })}
                onGenerate={handleAiRun}
                onClose={() => setIsAiOpen(false)}
                hideActions
                // Phase 1: Inspiration props
                inspirationTopics={inspirationTopics}
                inspirationNiche={inspirationNiche}
                isLoadingInspiration={isLoadingInspiration}
                onInspirationNicheChange={setInspirationNiche}
                onFetchInspiration={handleFetchInspiration}
                onInspirationSelect={handleInspirationSelect}
                // Phase 2: Template props
                templateConfig={templateConfig}
                templateFormat={templateFormat}
                onTemplateFormatChange={setTemplateFormat}
                onOpenTemplatesDialog={handleOpenTemplatesDialog}
                // Phase 3: Hashtag chips props
                generatedHashtags={generatedHashtags}
                onHashtagClick={(tag) => {
                  const targetId = aiTargetTweetId ?? activeTweetId ?? tweets[0]?.id;
                  if (targetId) {
                    const tweet = tweets.find((t) => t.id === targetId);
                    if (tweet) {
                      updateTweet(targetId, `${tweet.content} ${tag}`.trim());
                      setGeneratedHashtags((prev) => prev.filter((t) => t !== tag));
                    }
                  }
                }}
                onHashtagsDone={() => setGeneratedHashtags([])}
                isAiOpen={isAiOpen}
              />
            </div>
            <div className="mt-2 flex shrink-0 justify-end gap-2 border-t px-4 pt-3 pb-4 sm:px-6 sm:pt-4 sm:pb-6">
              <Button
                variant="outline"
                size="sm"
                className="h-10 sm:h-9"
                onClick={() => setIsAiOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-10 sm:h-9"
                onClick={() => handleAiRun()}
                disabled={isAiGenerateDisabled}
              >
                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* C1: Confirm before overwriting existing compose content */}
      <AlertDialog open={confirmOverwrite} onOpenChange={setConfirmOverwrite}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace existing content?</AlertDialogTitle>
            <AlertDialogDescription>
              Generating a new thread will replace your current{" "}
              {tweets.filter((t) => t.content.trim()).length} tweet(s) with AI-generated content.
              Your draft was auto-saved and can be restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmOverwrite(false);
                setPendingTweets(null);
                setPendingAiStreamGenerate(false);
                preStreamTweetsRef.current = null;
              }}
            >
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingTweets) {
                  // Template application case
                  setTweets(pendingTweets);
                  setPreviewIndex(0);
                  setPendingTweets(null);
                  setIsAiOpen(false);
                  toast.success("Thread generated!");
                } else if (pendingAiStreamGenerate) {
                  // P2-F: AI streaming case — resume generation after confirmation
                  setPendingAiStreamGenerate(false);
                  void handleAiRun({ skipOverwriteCheck: true });
                }
                setConfirmOverwrite(false);
              }}
            >
              Replace &amp; Generate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Phase 0: Confirm before translating all tweets */}
      <AlertDialog open={confirmTranslate} onOpenChange={setConfirmTranslate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Translate tweets?</AlertDialogTitle>
            <AlertDialogDescription>
              This will translate {tweets.filter((t) => t.content.trim()).length} tweet(s) to{" "}
              {LANGUAGES.find((l) => l.code === aiTranslateTarget)?.label || aiTranslateTarget}.
              Your draft was auto-saved and can be restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmTranslate(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmTranslate(false);
                void handleAiRun({ skipTranslateCheck: true });
              }}
            >
              Translate
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
