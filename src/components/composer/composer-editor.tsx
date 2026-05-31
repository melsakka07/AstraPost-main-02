"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Clock, ListOrdered, Plus, X as XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FeedbackButtons } from "@/components/ai/feedback-buttons";
import { RefineInlineForm } from "@/components/ai/refine-inline-form";
import { UpsellBanner } from "@/components/ai/upsell-banner";
import { ComposerAlerts } from "@/components/composer/composer-alerts";
import type { LinkPreview, TweetDraft } from "@/components/composer/composer-types";
import { applyNumbering, removeNumbering } from "@/components/composer/composer-utils";
import { SortableTweet } from "@/components/composer/sortable-tweet";
import type { useComposerAi } from "@/components/composer/use-composer-ai";
import { Button } from "@/components/ui/button";
import { type XSubscriptionTier } from "@/components/ui/x-subscription-badge";

function formatTimeAgo(date: Date, justNow: string, minutesAgo: string): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return justNow;
  return `${Math.floor(seconds / 60)}${minutesAgo}`;
}

type AiState = ReturnType<typeof useComposerAi>;

interface ComposerEditorProps extends Pick<
  AiState,
  | "isAiOpen"
  | "aiTool"
  | "aiTargetTweetId"
  | "generatedHashtags"
  | "setGeneratedHashtags"
  | "aiAddNumbering"
  | "setAiAddNumbering"
  | "lastGenerationId"
  | "setLastGenerationId"
  | "userPlan"
> {
  tweets: TweetDraft[];
  setTweets: Dispatch<SetStateAction<TweetDraft[]>>;
  effectiveTier: XSubscriptionTier | undefined;
  userHandle: string;
  pendingDraftRestore: TweetDraft[] | null;
  onAcceptDraftRestore: () => void;
  onDiscardDraftRestore: () => void;
  sourceAttribution: { handle?: string; url?: string; label?: string } | null;
  onDismissSourceAttribution: () => void;
  calendarMeta: { tone: string; topic: string } | null;
  onDismissCalendarMeta: () => void;
  hasMixedTiers: boolean;
  dndId: string;
  onDragEnd: (event: DragEndEvent) => void;
  updateTweet: (id: string, content: string) => void;
  updateTweetPreview: (id: string, preview: LinkPreview | null) => void;
  removeTweet: (id: string) => void;
  removeTweetMedia: (id: string, url: string) => void;
  triggerFileUpload: (id: string) => void;
  openAiImage: (id: string) => void;
  onMoveTweet: (fromIndex: number, toIndex: number) => void;
  onClearTweet: (id: string) => void;
  isTweetsNumbered: boolean;
  addTweet: () => void;
  lastSavedAt: Date | null;
  showSavedLabel: boolean;
}

export function ComposerEditor({
  tweets,
  setTweets,
  effectiveTier,
  userHandle,
  pendingDraftRestore,
  onAcceptDraftRestore,
  onDiscardDraftRestore,
  sourceAttribution,
  onDismissSourceAttribution,
  calendarMeta,
  onDismissCalendarMeta,
  hasMixedTiers,
  dndId,
  onDragEnd,
  isAiOpen,
  aiTool,
  aiTargetTweetId,
  updateTweet,
  updateTweetPreview,
  removeTweet,
  removeTweetMedia,
  triggerFileUpload,
  openAiImage,
  onMoveTweet,
  onClearTweet,
  isTweetsNumbered,
  addTweet,
  generatedHashtags,
  setGeneratedHashtags,
  aiAddNumbering,
  setAiAddNumbering,
  lastGenerationId,
  setLastGenerationId,
  userPlan,
  lastSavedAt,
  showSavedLabel,
}: ComposerEditorProps) {
  const t = useTranslations("compose");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div className="space-y-3 sm:space-y-4 lg:col-span-2">
      {/* P3-E: First-time composer hint overlay & all other alerts */}
      <ComposerAlerts
        tweets={tweets}
        effectiveTier={effectiveTier ?? null}
        userHandle={userHandle}
        pendingDraftRestore={pendingDraftRestore}
        onAcceptDraftRestore={onAcceptDraftRestore}
        onDiscardDraftRestore={onDiscardDraftRestore}
        sourceAttribution={sourceAttribution}
        onDismissSourceAttribution={onDismissSourceAttribution}
        calendarMeta={calendarMeta}
        onDismissCalendarMeta={onDismissCalendarMeta}
        hasMixedTiers={hasMixedTiers}
      />

      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={tweets.map((tw) => tw.id)} strategy={verticalListSortingStrategy}>
          {tweets.map((tweet, index) => {
            // Phase 3: Compute isAiTarget based on aiTool
            const isAiTarget = (() => {
              if (!isAiOpen) return false;
              if (aiTool === "thread" || aiTool === "inspire" || aiTool === "template") return true;
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
                openAiImage={openAiImage}
                onMove={onMoveTweet}
                onClearTweet={() => onClearTweet(tweet.id)}
                tier={effectiveTier}
                isAiTarget={isAiTarget}
                isTweetsNumbered={isTweetsNumbered}
                onToggleNumbering={() =>
                  setTweets(
                    isTweetsNumbered ? removeNumbering([...tweets]) : applyNumbering([...tweets])
                  )
                }
                selectedTier={effectiveTier}
                {...(index === 0 && { onConvertToThread: addTweet })}
                {...(tweet.id === aiTargetTweetId &&
                  generatedHashtags.length > 0 && {
                    suggestedHashtags: generatedHashtags,
                    onHashtagClick: (tag: string) => {
                      updateTweet(tweet.id, `${tweet.content} ${tag}`.trim());
                      setGeneratedHashtags((prev) => prev.filter((existing) => existing !== tag));
                    },
                  })}
              />
            );
          })}
        </SortableContext>
      </DndContext>

      {/* Phase 4: Feedback + Refine for last AI generation */}
      {lastGenerationId && (
        <div className="animate-in fade-in flex flex-wrap items-center gap-2 px-1 duration-200">
          <FeedbackButtons generationId={lastGenerationId} />
          <RefineInlineForm
            generationId={lastGenerationId}
            originalOutput={tweets.map((tw) => tw.content).join("\n\n")}
            onRefined={(refined) => {
              // Replace first tweet with refined output for single-post,
              // or show refined text below for thread
              if (!refined) return;
              setLastGenerationId(null);
              toast.success(t("alerts.refine_success"), {
                description: refined.slice(0, 150) + (refined.length > 150 ? "..." : ""),
              });
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-7 gap-1 text-xs"
            onClick={() => setLastGenerationId(null)}
          >
            <XIcon className="h-3 w-3" />
            {t("alerts.dismiss")}
          </Button>
        </div>
      )}

      {/* Phase 4: Upsell banner after AI generation for free/trial users */}
      {lastGenerationId && <UpsellBanner plan={userPlan} className="mb-2" />}

      {lastSavedAt && showSavedLabel && (
        <div className="text-muted-foreground/60 flex items-center justify-end gap-1 px-1 text-xs">
          <Clock className="h-3 w-3" />
          <span>
            {t("label.auto_saved")} ·{" "}
            {formatTimeAgo(lastSavedAt, t("label.just_now"), t("label.minutes_ago"))}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="flex-1 border-dashed py-4 text-sm sm:py-6 sm:text-base"
          onClick={addTweet}
        >
          <Plus className="me-1.5 h-4 w-4 sm:me-2" />
          {tweets.length === 1 ? t("label.convert_to_thread") : t("label.add_to_thread")}
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
            title={aiAddNumbering ? t("alerts.auto_number_on") : t("alerts.auto_number_off")}
          >
            <ListOrdered className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {aiAddNumbering ? t("label.thread_mode_on") : t("label.thread_mode_off")}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
