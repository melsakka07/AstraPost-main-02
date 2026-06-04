"use client";

import { useState, useRef, useId } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Clock, ImageIcon, Loader2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ComposerAiTools } from "@/components/composer/composer-ai-tools";
import { ComposerDialogs } from "@/components/composer/composer-dialogs";
import { ComposerEditor } from "@/components/composer/composer-editor";
import { ComposerPreview } from "@/components/composer/composer-preview";
import { ComposerPublishingPanel } from "@/components/composer/composer-publishing-panel";
import type { TweetDraft } from "@/components/composer/composer-types";
import { MediaLibraryPicker } from "@/components/composer/media-library-picker";
import { SaveTemplateDialog } from "@/components/composer/save-template-dialog";
import { useComposerAi } from "@/components/composer/use-composer-ai";
import { useComposerBridge } from "@/components/composer/use-composer-bridge";
import { useComposerData } from "@/components/composer/use-composer-data";
import { useComposerDrafts } from "@/components/composer/use-composer-drafts";
import { useComposerMedia } from "@/components/composer/use-composer-media";
import { useComposerPublish } from "@/components/composer/use-composer-publish";
import { useComposerShortcuts } from "@/components/composer/use-composer-shortcuts";
import { useComposerTweets } from "@/components/composer/use-composer-tweets";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { type XSubscriptionTier } from "@/components/ui/x-subscription-badge";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSession } from "@/lib/auth-client";
import { clientLogger } from "@/lib/client-logger";
import { canPostLongContent } from "@/lib/services/x-subscription";
import { createUserTemplate } from "@/lib/templates";

export function Composer({ hasScheduledPost }: { hasScheduledPost?: boolean }) {
  const t = useTranslations("compose");

  const dndId = useId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams?.get("draft");
  const [tweets, setTweets] = useState<TweetDraft[]>([{ id: "1", content: "", media: [] }]);
  const [scheduledDate, setScheduledDate] = useState<string>(
    searchParams?.get("scheduledAt") ?? ""
  );
  const [recurrencePattern, setRecurrencePattern] = useState<string>("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>("");
  const [targetAccountIds, setTargetAccountIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Tracks whether bridge content (sessionStorage / URL prefill) was loaded on
  // mount, so the localStorage auto-save restore doesn't overwrite it.
  const bridgeLoadedRef = useRef(false);
  // Bridge hook must run before the drafts hook: its mount effect sets
  // bridgeLoadedRef, which the drafts hook's restore-banner check reads.
  const { sourceAttribution, setSourceAttribution, calendarMeta, setCalendarMeta } =
    useComposerBridge({ draftId, searchParams, setTweets, bridgeLoadedRef });
  const {
    lastSavedAt,
    showSavedLabel,
    pendingDraftRestore,
    acceptDraftRestore,
    discardDraftRestore,
    confirmNavDialog,
    setConfirmNavDialog,
    pendingNavHref,
    setPendingNavHref,
  } = useComposerDrafts({ tweets, setTweets, draftId, bridgeLoadedRef, router, t });
  const [activeTweetId, setActiveTweetId] = useState<string | null>(null);
  const { data: session } = useSession();

  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(() => {
    if (hasScheduledPost !== undefined) return hasScheduledPost;
    return !!searchParams?.get("scheduledAt");
  });
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateCategory, setTemplateCategory] = useState("Personal");

  // Preview carousel index (H6)
  const [previewIndex, setPreviewIndex] = useState(0);

  const { openWithContext: openUpgradeModal } = useUpgradeModal();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const {
    accounts,
    accountsLoading,
    mounted,
    editingDraftId,
    setEditingDraftId,
    browserTimezone,
    userPlanLimits,
  } = useComposerData({
    draftId,
    sessionUserId: session?.user?.id,
    setTweets,
    setScheduledDate,
    targetAccountIds,
    setTargetAccountIds,
  });

  const handleSaveTemplate = async () => {
    if (!templateTitle.trim()) {
      toast.error(t("toast.title_required"));
      return;
    }

    setIsSubmitting(true);
    try {
      await createUserTemplate({
        title: templateTitle,
        description: templateDescription,
        category: templateCategory,
        content: tweets.map((t) => t.content),
        ...(ai.lastTemplateAiMeta ? { aiMeta: ai.lastTemplateAiMeta } : {}),
      });
      toast.success(t("toast.template_saved"));
      setIsSaveTemplateOpen(false);
      setTemplateTitle("");
      setTemplateDescription("");
      setTemplateCategory("Personal");
    } catch (e) {
      toast.error(t("toasts.save_template_failed"));
      clientLogger.error("Failed to save template", {
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const { isSubmitting, setIsSubmitting, handlePlanLimit, handleSubmit } = useComposerPublish({
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
  });

  const updateTweet = (id: string, content: string) => {
    setTweets(tweets.map((t) => (t.id === id ? { ...t, content } : t)));
  };

  const ai = useComposerAi({
    tweets,
    setTweets,
    updateTweet,
    setPreviewIndex,
    targetAccountIds,
    activeTweetId,
    handlePlanLimit,
    openUpgradeModal,
    session,
    searchParams,
    t,
  });

  const {
    isAiImageOpen,
    setIsAiImageOpen,
    aiImageTargetTweetId,
    openAiImageDialog,
    handleAiImageAttach,
    handleFileUpload,
    triggerFileUpload,
    isLibraryOpen,
    openMediaLibrary,
    closeMediaLibrary,
    handleLibrarySelect,
  } = useComposerMedia({ tweets, setTweets, activeTweetId, setActiveTweetId, fileInputRef });

  const {
    addTweet,
    removeTweet,
    clearTweet,
    moveTweet,
    updateTweetPreview,
    removeTweetMedia,
    handleDragEnd,
    isTweetsNumbered,
  } = useComposerTweets({
    tweets,
    setTweets,
    setPreviewIndex,
    setGeneratedHashtags: ai.setGeneratedHashtags,
    aiAddNumbering: ai.aiAddNumbering,
  });

  const hasContent = tweets.every((t) => t.content.trim().length > 0);

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
    ai.isGenerating ||
    (ai.aiTool === "thread" && !ai.aiTopic) ||
    (ai.aiTool === "hook" && !ai.aiTopic && !(tweets[0]?.content || "").trim()) ||
    (ai.aiTool === "rewrite" && !ai.aiRewriteText.trim()) ||
    (ai.aiTool === "translate" && !tweets.some((t) => t.content.trim())) ||
    (ai.aiTool === "hashtags" &&
      !(tweets.find((t) => t.id === ai.aiTargetTweetId)?.content ?? "").trim());

  useComposerShortcuts({
    hasContent,
    isSubmitting,
    scheduledDate,
    handleSubmit,
    isAiOpen: ai.isAiOpen,
    setIsAiOpen: ai.setIsAiOpen,
    openAiTool: ai.openAiTool,
  });

  // Active tweet media count for media library cap enforcement
  const libraryAttachedCount = activeTweetId
    ? (tweets.find((tw) => tw.id === activeTweetId)?.media.length ?? 0)
    : 0;

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
      <ComposerEditor
        {...ai}
        tweets={tweets}
        setTweets={setTweets}
        effectiveTier={effectiveTier}
        userHandle={userHandle}
        pendingDraftRestore={pendingDraftRestore}
        onAcceptDraftRestore={acceptDraftRestore}
        onDiscardDraftRestore={discardDraftRestore}
        sourceAttribution={sourceAttribution}
        onDismissSourceAttribution={() => setSourceAttribution(null)}
        calendarMeta={calendarMeta}
        onDismissCalendarMeta={() => setCalendarMeta(null)}
        hasMixedTiers={hasMixedTiers}
        dndId={dndId}
        onDragEnd={handleDragEnd}
        updateTweet={updateTweet}
        updateTweetPreview={updateTweetPreview}
        removeTweet={removeTweet}
        removeTweetMedia={removeTweetMedia}
        triggerFileUpload={triggerFileUpload}
        openAiImage={openAiImageDialog}
        onMoveTweet={moveTweet}
        onClearTweet={clearTweet}
        isTweetsNumbered={isTweetsNumbered}
        addTweet={addTweet}
        lastSavedAt={lastSavedAt}
        showSavedLabel={showSavedLabel}
      />

      {/* Sidebar Column */}
      <div className="flex flex-col space-y-3 sm:space-y-4">
        {/* B1: Preview section moved to top of sidebar */}
        <Card>
          <ComposerPreview
            tweets={tweets}
            previewTweet={previewTweet ?? null}
            userImage={userImage ?? null}
            userName={userName}
            userHandle={userHandle}
            session={session}
          />
        </Card>

        {/* Media Library trigger — 2.8: always visible, targets active or first tweet */}
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-full gap-1.5 text-xs"
          onClick={() => openMediaLibrary(activeTweetId ?? tweets[0]?.id ?? "")}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          {t("media_library.title")}
        </Button>

        {/* Card 1: AI Tools — single entry point; tool switching via tabs inside panel */}
        <ComposerAiTools
          {...ai}
          isDesktop={isDesktop}
          selectedTier={selectedTier ?? null}
          tweets={tweets}
          activeTweetId={activeTweetId}
          updateTweet={updateTweet}
          isAiGenerateDisabled={isAiGenerateDisabled}
        />

        {/* Card 2: Publishing (H1 — split from content tools) */}
        <ComposerPublishingPanel
          scheduledDate={scheduledDate}
          setScheduledDate={setScheduledDate}
          recurrencePattern={recurrencePattern}
          setRecurrencePattern={setRecurrencePattern}
          recurrenceEndDate={recurrenceEndDate}
          setRecurrenceEndDate={setRecurrenceEndDate}
          showAdvancedOptions={showAdvancedOptions}
          setShowAdvancedOptions={setShowAdvancedOptions}
          isSubmitting={isSubmitting}
          hasContent={hasContent}
          accounts={accounts}
          accountsLoading={accountsLoading}
          targetAccountIds={targetAccountIds}
          setTargetAccountIds={setTargetAccountIds}
          browserTimezone={browserTimezone}
          onSubmit={handleSubmit}
          onOpenSaveTemplate={() => setIsSaveTemplateOpen(true)}
        />

        <SaveTemplateDialog
          open={isSaveTemplateOpen}
          onOpenChange={setIsSaveTemplateOpen}
          title={templateTitle}
          onTitleChange={setTemplateTitle}
          description={templateDescription}
          onDescriptionChange={setTemplateDescription}
          category={templateCategory}
          onCategoryChange={setTemplateCategory}
          aiMeta={ai.lastTemplateAiMeta}
          isSubmitting={isSubmitting}
          onSave={handleSaveTemplate}
        />
      </div>

      <ComposerDialogs
        {...ai}
        tweets={tweets}
        setTweets={setTweets}
        setPreviewIndex={setPreviewIndex}
        isAiImageOpen={isAiImageOpen}
        setIsAiImageOpen={setIsAiImageOpen}
        aiImageTargetTweetId={aiImageTargetTweetId}
        onAiImageAttach={handleAiImageAttach}
        userPlanLimits={userPlanLimits}
        confirmNavDialog={confirmNavDialog}
        setConfirmNavDialog={setConfirmNavDialog}
        pendingNavHref={pendingNavHref}
        setPendingNavHref={setPendingNavHref}
        navigate={(href) => router.push(href)}
      />

      {/* 2.2: Mobile sticky bottom action bar — pins primary action to viewport bottom */}
      <div className="bg-background sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] z-30 -mx-4 border-t px-4 py-3 md:hidden">
        <Button
          className="h-11 w-full text-sm font-semibold"
          onClick={() => handleSubmit(scheduledDate ? "schedule" : "publish_now")}
          disabled={isSubmitting || !hasContent}
        >
          {isSubmitting ? (
            <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
          ) : scheduledDate ? (
            <Clock className="me-1.5 h-4 w-4" />
          ) : (
            <Send className="me-1.5 h-4 w-4" />
          )}
          {scheduledDate ? t("label.schedule") : t("label.post_now")}
        </Button>
      </div>

      {/* Media Library Picker */}
      <MediaLibraryPicker
        open={isLibraryOpen}
        onOpenChange={(open) => {
          if (!open) closeMediaLibrary();
        }}
        onSelect={handleLibrarySelect}
        attachedCount={libraryAttachedCount}
      />
    </div>
  );
}
