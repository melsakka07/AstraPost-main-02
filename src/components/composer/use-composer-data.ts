"use client";

import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { TweetDraft } from "@/components/composer/composer-types";
import type { SocialAccountLite } from "@/components/composer/target-accounts-select";
import { clientLogger } from "@/lib/client-logger";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

type ImageModel = "nano-banana-2" | "nano-banana-pro" | "nano-banana" | "gpt-image-2";

interface UserPlanLimits {
  availableModels: ImageModel[];
  preferredModel: ImageModel;
  remainingQuota: number;
}

interface UseComposerDataArgs {
  draftId: string | null | undefined;
  sessionUserId: string | undefined;
  setTweets: Dispatch<SetStateAction<TweetDraft[]>>;
  setScheduledDate: Dispatch<SetStateAction<string>>;
  targetAccountIds: string[];
  setTargetAccountIds: Dispatch<SetStateAction<string[]>>;
}

export function useComposerData({
  draftId,
  sessionUserId,
  setTweets,
  setScheduledDate,
  targetAccountIds,
  setTargetAccountIds,
}: UseComposerDataArgs) {
  const t = useTranslations("compose");

  const [accounts, setAccounts] = useState<SocialAccountLite[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  // Used to restore the draft's linked account once accounts have loaded
  const [draftXAccountId, setDraftXAccountId] = useState<string | null>(null);
  const [browserTimezone, setBrowserTimezone] = useState<string | null>(null);
  const [userPlanLimits, setUserPlanLimits] = useState<UserPlanLimits>({
    availableModels: ["nano-banana-2"],
    preferredModel: "nano-banana-2",
    // Start at 0 — updated from server once session is available.
    // Avoids showing a stale hard-coded value before the API responds.
    remainingQuota: 0,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setAccountsLoading(true);
        const res = await fetchWithAuth("/api/accounts", { method: "GET" });
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
    if (!sessionUserId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithAuth("/api/ai/image/quota");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setUserPlanLimits({
          availableModels: data.availableModels ?? ["nano-banana-2"],
          preferredModel: data.preferredModel ?? "nano-banana-2",
          remainingQuota: data.remainingImages ?? 0,
        });
      } catch (e) {
        clientLogger.error("Failed to fetch AI image quota", {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionUserId]);

  // Detect browser timezone once after mount (SSR-safe — avoids hydration mismatch)
  useEffect(() => {
    setBrowserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  // ── Composer Bridge ─────────────────────────────────────────────────────────
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
          (tw: {
            content?: string;
            media?: Array<{
              fileUrl: string;
              fileType: "image" | "video" | "gif";
              fileSize?: number;
            }>;
          }) => ({
            id: Math.random().toString(36).substr(2, 9),
            content: tw.content || "",
            media: (tw.media || []).map((m) => ({
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
          toast.success(t("toast.draft_loaded"));
        }
      } catch (e) {
        clientLogger.error("Failed to load draft", {
          draftId,
          error: e instanceof Error ? e.message : String(e),
        });
        toast.error(t("toast.draft_load_failed"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draftId, t]); // eslint-disable-line react-hooks/exhaustive-deps

  // Once both accounts and the draft's linked account ID are known, restore the selection
  useEffect(() => {
    if (!draftXAccountId || accounts.length === 0) return;
    if (accounts.some((a) => a.id === draftXAccountId)) {
      setTargetAccountIds([draftXAccountId]);
    }
  }, [draftXAccountId, accounts]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    accounts,
    accountsLoading,
    mounted,
    editingDraftId,
    setEditingDraftId,
    browserTimezone,
    userPlanLimits,
  };
}
