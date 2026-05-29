"use client";

import type { Dispatch, SetStateAction } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { TweetDraft } from "@/components/composer/composer-types";
import type { useComposerAi } from "@/components/composer/use-composer-ai";
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
import { LANGUAGES } from "@/lib/constants";

const AiImageDialog = dynamic(() =>
  import("@/components/composer/ai-image-dialog").then((m) => m.AiImageDialog)
);

type AiState = ReturnType<typeof useComposerAi>;

interface ComposerDialogsProps extends Pick<
  AiState,
  | "confirmOverwrite"
  | "setConfirmOverwrite"
  | "pendingTweets"
  | "setPendingTweets"
  | "pendingAiStreamGenerate"
  | "setPendingAiStreamGenerate"
  | "preStreamTweetsRef"
  | "setIsAiOpen"
  | "handleAiRun"
  | "confirmTranslate"
  | "setConfirmTranslate"
  | "aiTranslateTarget"
> {
  tweets: TweetDraft[];
  setTweets: Dispatch<SetStateAction<TweetDraft[]>>;
  setPreviewIndex: Dispatch<SetStateAction<number>>;
  isAiImageOpen: boolean;
  setIsAiImageOpen: Dispatch<SetStateAction<boolean>>;
  aiImageTargetTweetId: string | null;
  onAiImageAttach: (image: {
    imageUrl: string;
    width: number;
    height: number;
    model: string;
    prompt: string;
  }) => void;
  userPlanLimits: {
    availableModels: ("nano-banana-2" | "nano-banana-pro" | "nano-banana" | "gpt-image-2")[];
    preferredModel: "nano-banana-2" | "nano-banana-pro" | "nano-banana" | "gpt-image-2";
    remainingQuota: number;
  };
  confirmNavDialog: boolean;
  setConfirmNavDialog: Dispatch<SetStateAction<boolean>>;
  pendingNavHref: string | null;
  setPendingNavHref: Dispatch<SetStateAction<string | null>>;
  navigate: (href: string) => void;
}

export function ComposerDialogs({
  confirmOverwrite,
  setConfirmOverwrite,
  pendingTweets,
  setPendingTweets,
  pendingAiStreamGenerate,
  setPendingAiStreamGenerate,
  preStreamTweetsRef,
  setIsAiOpen,
  handleAiRun,
  confirmTranslate,
  setConfirmTranslate,
  aiTranslateTarget,
  tweets,
  setTweets,
  setPreviewIndex,
  isAiImageOpen,
  setIsAiImageOpen,
  aiImageTargetTweetId,
  onAiImageAttach,
  userPlanLimits,
  confirmNavDialog,
  setConfirmNavDialog,
  pendingNavHref,
  setPendingNavHref,
  navigate,
}: ComposerDialogsProps) {
  const t = useTranslations("compose");

  return (
    <>
      {/* C1: Confirm before overwriting existing compose content */}
      <AlertDialog open={confirmOverwrite} onOpenChange={setConfirmOverwrite}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialog.replace_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("dialog.replace_description")}</AlertDialogDescription>
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
              {t("dialog.keep_editing")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingTweets) {
                  // Template application case
                  setTweets(pendingTweets);
                  setPreviewIndex(0);
                  setPendingTweets(null);
                  setIsAiOpen(false);
                  toast.success(t("toasts.thread_generated"));
                } else if (pendingAiStreamGenerate) {
                  // P2-F: AI streaming case — resume generation after confirmation
                  setPendingAiStreamGenerate(false);
                  void handleAiRun({ skipOverwriteCheck: true });
                }
                setConfirmOverwrite(false);
              }}
            >
              {t("dialog.replace_generate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Phase 0: Confirm before translating all tweets */}
      <AlertDialog open={confirmTranslate} onOpenChange={setConfirmTranslate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialog.translate_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialog.translate_description", {
                count: tweets.filter((tw) => tw.content.trim()).length,
                language:
                  LANGUAGES.find((l) => l.code === aiTranslateTarget)?.label || aiTranslateTarget,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmTranslate(false)}>
              {t("label.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmTranslate(false);
                void handleAiRun({ skipTranslateCheck: true });
              }}
            >
              {t("dialog.translate_button")}
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
            ? tweets.find((tw) => tw.id === aiImageTargetTweetId)?.content || ""
            : ""
        }
        onImageAttach={onAiImageAttach}
        availableModels={userPlanLimits.availableModels}
        userPreferredModel={userPlanLimits.preferredModel}
        remainingQuota={userPlanLimits.remainingQuota}
        attachedCount={
          aiImageTargetTweetId
            ? (tweets.find((tw) => tw.id === aiImageTargetTweetId)?.media.length ?? 0)
            : 0
        }
      />

      {/* UA-A13: Confirm before SPA navigation away mid-draft */}
      <AlertDialog open={confirmNavDialog} onOpenChange={setConfirmNavDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialog.discard_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("dialog.discard_description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingNavHref(null)}>
              {t("label.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingNavHref) {
                  navigate(pendingNavHref);
                  setPendingNavHref(null);
                }
                setConfirmNavDialog(false);
              }}
            >
              {t("dialog.continue")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
