"use client";

import { type Dispatch, type SetStateAction, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { TweetDraft } from "@/components/composer/composer-types";
import type { UpgradeContext } from "@/components/ui/upgrade-modal";
import { clientLogger } from "@/lib/client-logger";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

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

interface UseComposerPublishArgs {
  tweets: TweetDraft[];
  setTweets: Dispatch<SetStateAction<TweetDraft[]>>;
  setPreviewIndex: Dispatch<SetStateAction<number>>;
  editingDraftId: string | null;
  setEditingDraftId: Dispatch<SetStateAction<string | null>>;
  scheduledDate: string;
  setScheduledDate: Dispatch<SetStateAction<string>>;
  recurrencePattern: string;
  setRecurrencePattern: Dispatch<SetStateAction<string>>;
  recurrenceEndDate: string;
  setRecurrenceEndDate: Dispatch<SetStateAction<string>>;
  targetAccountIds: string[];
  openUpgradeModal: (context: UpgradeContext) => void;
}

export function useComposerPublish({
  tweets,
  setTweets,
  setPreviewIndex,
  editingDraftId,
  setEditingDraftId,
  scheduledDate,
  setScheduledDate,
  recurrencePattern,
  setRecurrencePattern,
  recurrenceEndDate,
  setRecurrenceEndDate,
  targetAccountIds,
  openUpgradeModal,
}: UseComposerPublishArgs) {
  const t = useTranslations("compose");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (action: "draft" | "schedule" | "publish_now") => {
    const isUploading = tweets.some((tw) => tw.media.some((m) => m.uploading));
    if (isUploading) {
      toast.error(t("toasts.wait_for_upload"));
      return;
    }

    // Validate that every tweet has content (API rejects empty strings)
    const emptyIndex = tweets.findIndex((tw) => !tw.content.trim());
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
        res = await fetchWithAuth(`/api/posts/${editingDraftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tweets: tweets.map((tw) => ({
              content: tw.content,
              media: tw.media,
            })),
            scheduledAt: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
            action,
          }),
        });
      } else {
        res = await fetchWithAuth("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tweets: tweets.map((tw) => ({
              content: tw.content,
              media: tw.media,
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
        const detail =
          error.issues
            ?.map(
              (i: { path?: (string | number)[]; message?: string }) =>
                `${i.path?.join(".") ?? ""}: ${i.message}`
            )
            .join("; ") ??
          error.error ??
          "Failed to submit";
        throw new Error(detail);
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
      clientLogger.error("Post submission failed", {
        action,
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, setIsSubmitting, handlePlanLimit, handleSubmit };
}
