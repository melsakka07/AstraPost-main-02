"use client";

import type { useComposerAi } from "@/components/composer/use-composer-ai";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

type AiState = ReturnType<typeof useComposerAi>;

interface UseComposerShortcutsArgs extends Pick<
  AiState,
  "isAiOpen" | "setIsAiOpen" | "openAiTool"
> {
  hasContent: boolean;
  isSubmitting: boolean;
  scheduledDate: string;
  handleSubmit: (action: "draft" | "schedule" | "publish_now") => void | Promise<void>;
}

export function useComposerShortcuts({
  hasContent,
  isSubmitting,
  scheduledDate,
  handleSubmit,
  isAiOpen,
  setIsAiOpen,
  openAiTool,
}: UseComposerShortcutsArgs) {
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
}
