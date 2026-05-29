"use client";

import { useMemo } from "react";
import {
  ArrowLeft,
  BookmarkIcon,
  Calendar,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { AccountInfo } from "@/components/ai/agentic/input-screen";
import { AgenticTweetCard } from "@/components/ai/agentic/tweet-card";
import { XThreadPreview } from "@/components/ai/agentic/x-thread-preview";
import { UpsellBanner } from "@/components/ai/upsell-banner";
import { TweetEditorList } from "@/components/dashboard/tweet-editor-list";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import type { AgenticPost, AgenticTweet } from "@/lib/ai/agentic-types";

interface ReviewScreenProps {
  agenticPost: AgenticPost | null;
  editedTweets: AgenticTweet[];
  editingIndex: number | null;
  editText: string;
  setEditText: (v: string) => void;
  rewritingIndex: number | null;
  showResearch: boolean;
  setShowResearch: (v: boolean) => void;
  scheduleDate: string;
  setScheduleDate: (v: string) => void;
  scheduleTime: string;
  setScheduleTime: (v: string) => void;
  showSchedulePicker: boolean;
  setShowSchedulePicker: (v: boolean) => void;
  isSubmitting: boolean;
  selectedAccount: AccountInfo | undefined;
  onEditStart: (idx: number) => void;
  onEditSave: (idx: number) => void;
  onEditCancel: () => void;
  onRewrite: (idx: number) => void;
  onRemove: (idx: number) => void;
  onAddTweet: (afterIndex?: number) => void;
  onApprove: (action: "post_now" | "schedule" | "save_draft") => void;
  onReorder: (activeId: string, overId: string) => void;
  onChangeTopic: () => void;
  onRegenerateAll: () => void;
  onDiscard: () => void;
  userPlan?: string | null;
}

export function ReviewScreen({
  agenticPost,
  editedTweets,
  editingIndex,
  editText,
  setEditText,
  userPlan,
  rewritingIndex,
  showResearch,
  setShowResearch,
  scheduleDate,
  setScheduleDate,
  scheduleTime,
  setScheduleTime,
  showSchedulePicker,
  setShowSchedulePicker,
  isSubmitting,
  selectedAccount,
  onEditStart,
  onEditSave,
  onEditCancel,
  onRewrite,
  onRemove,
  onAddTweet,
  onApprove,
  onReorder,
  onChangeTopic,
  onRegenerateAll,
  onDiscard,
}: ReviewScreenProps) {
  const t = useTranslations("ai_agentic");

  const qualityIssues = useMemo(() => {
    const issues: string[] = [];
    editedTweets.forEach((tw, i) => {
      if (tw.charCount > 280) issues.push(t("review_screen.issue_tweet_over_limit", { n: i + 1 }));
      if (tw.hasImage && (!tw.imagePrompt || tw.imagePrompt.trim().length === 0))
        issues.push(t("review_screen.issue_image_no_alt", { n: i + 1 }));
    });
    return issues;
  }, [editedTweets, t]);

  if (!agenticPost) return null;

  return (
    <div className="animate-in fade-in mx-auto max-w-2xl space-y-4 pb-32 duration-300 lg:grid lg:max-w-5xl lg:grid-cols-[1fr_320px] lg:items-start lg:gap-6">
      {/* Main content column */}
      <div className="min-w-0 space-y-4">
        {/* Review header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-muted-foreground text-sm">{t("review_screen.ready")}</p>
            <h2 className="truncate font-semibold">{agenticPost.summary}</h2>
          </div>
        </div>
        {/* Quality issues list */}
        {qualityIssues.length > 0 && (
          <div className="bg-warning-2 border-warning-6 rounded-lg border p-3">
            <p className="text-warning-11 mb-1.5 text-xs font-semibold tracking-wide uppercase">
              {t("review_screen.quality_issues_title")}
            </p>
            <ul className="space-y-0.5">
              {qualityIssues.map((issue, i) => (
                <li key={i} className="text-warning-11/80 flex items-start gap-1.5 text-xs">
                  <span className="mt-0.5 shrink-0">•</span>
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Separator />

        {/* Phase 4: Upsell banner for free/trial users after agentic generation */}
        <UpsellBanner {...(userPlan !== undefined && { plan: userPlan })} />

        {/* Tweet cards — sortable */}
        <TweetEditorList
          items={editedTweets.map((t, i) => ({ id: String(i), content: t.text }))}
          sortablePrefix="agentic"
          forceThreadMode
          className="space-y-0"
          onReorder={(from, to) => onReorder(String(from), String(to))}
          renderInsertBetween={(afterIdx) => (
            <div className="group relative z-20 flex h-4 items-center justify-center">
              <button
                type="button"
                onClick={() => onAddTweet(afterIdx)}
                className="bg-background border-border text-muted-foreground/40 hover:text-primary hover:border-primary/40 absolute flex h-6 w-6 items-center justify-center rounded-full border opacity-0 shadow-sm transition-all group-hover:opacity-100"
                aria-label={t("review_screen.add_tweet")}
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          )}
        >
          {(slot) => {
            const idx = slot.index;
            const tweet = editedTweets[idx];
            if (!tweet) return null;
            return (
              <div className="relative">
                {idx < editedTweets.length - 1 && (
                  <div className="bg-border absolute start-5 top-full z-10 h-4 w-0.5" />
                )}
                <AgenticTweetCard
                  tweet={tweet}
                  index={idx}
                  total={editedTweets.length}
                  isEditing={editingIndex === idx}
                  isRewriting={rewritingIndex === idx}
                  editText={editText}
                  setEditText={setEditText}
                  username={selectedAccount?.username}
                  profileImageUrl={selectedAccount?.profileImageUrl}
                  subscriptionTier={selectedAccount?.subscriptionTier}
                  onEditStart={() => onEditStart(idx)}
                  onEditSave={() => onEditSave(idx)}
                  onEditCancel={onEditCancel}
                  onRewrite={() => onRewrite(idx)}
                  onRemove={() => onRemove(idx)}
                  dragHandleProps={slot.dragHandleProps}
                />
              </div>
            );
          }}
        </TweetEditorList>

        {/* Add tweet + Regenerate all */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={() => onAddTweet()} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {t("review_screen.add_tweet")}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onChangeTopic}
              className="text-muted-foreground gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5 rtl:scale-x-[-1]" />
              {t("review_screen.change_topic")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerateAll}
              className="text-muted-foreground gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t("review_screen.regenerate_all")}
            </Button>
          </div>
        </div>

        {/* Research insights (collapsible on mobile, hidden on desktop) */}
        <div className="border-border overflow-hidden rounded-lg border lg:hidden">
          <button
            onClick={() => setShowResearch(!showResearch)}
            className="hover:bg-muted/50 flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-colors"
          >
            <span>{t("review_screen.research_insights")}</span>
            {showResearch ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showResearch && (
            <div className="space-y-3 border-t px-4 py-4 text-sm">
              <ResearchInsightsContent agenticPost={agenticPost} />
            </div>
          )}
        </div>

        {/* Sticky action bar */}
        <div className="bg-background/95 fixed start-0 end-0 bottom-0 z-50 border-t px-4 py-4 backdrop-blur-sm md:static md:bottom-auto md:rounded-xl md:border md:px-6">
          {showSchedulePicker && (
            <div className="mb-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <DatePicker value={scheduleDate} onChange={setScheduleDate} />
                {scheduleDate && (
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="border-input bg-background focus:ring-ring h-9 rounded-lg border px-3 text-sm shadow-sm outline-none focus:ring-2"
                    aria-label={t("review_screen.schedule")}
                  />
                )}
              </div>
              {scheduleDate && (
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm" onClick={() => onApprove("schedule")} disabled={isSubmitting}>
                    <Calendar className="mr-1.5 h-3.5 w-3.5" />
                    {t("review_screen.confirm_schedule")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowSchedulePicker(false)}>
                    {t("dialogs.cancel_button")}
                  </Button>
                  <span className="text-muted-foreground text-xs">
                    {t("review_screen.schedule_time_hint", {
                      time: scheduleTime,
                      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    })}
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => onApprove("post_now")}
              disabled={isSubmitting}
              className="flex-1 gap-2 sm:flex-none"
            >
              {isSubmitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {t("review_screen.post_now")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowSchedulePicker(true);
              }}
              disabled={isSubmitting}
              className="flex-1 gap-2 sm:flex-none"
            >
              <Calendar className="h-4 w-4" />
              {scheduleDate
                ? t("review_screen.schedule_for", { date: scheduleDate })
                : t("review_screen.schedule")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onApprove("save_draft")}
              disabled={isSubmitting}
              className="text-muted-foreground gap-1.5"
            >
              <BookmarkIcon className="h-3.5 w-3.5" />
              {t("review_screen.save_draft")}
            </Button>
            {/* Discard behind meatball menu (Item 18) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground ml-auto h-8 w-8 p-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={onDiscard}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  {t("review_screen.discard")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      {/* end main content column */}

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        {/* X.com-style thread preview */}
        <div className="border-border mb-4 overflow-hidden rounded-lg border">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-medium">{t("review_screen.ready")}</p>
          </div>
          <div className="max-h-[50vh] overflow-y-auto px-4 py-4">
            <XThreadPreview
              tweets={editedTweets}
              username={selectedAccount?.username}
              profileImageUrl={selectedAccount?.profileImageUrl}
            />
          </div>
        </div>
        {/* Research insights */}
        <div className="border-border sticky top-4 overflow-hidden rounded-lg border">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-medium">{t("review_screen.research_insights")}</p>
          </div>
          <div className="space-y-3 px-4 py-4 text-sm">
            <ResearchInsightsContent agenticPost={agenticPost} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared research insights content ─────────────────────────────────────────

function ResearchInsightsContent({ agenticPost }: { agenticPost: AgenticPost }) {
  const t = useTranslations("ai_agentic");
  return (
    <>
      <div>
        <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
          {t("review_screen.recommended_angle")}
        </p>
        <p>{agenticPost.research.recommendedAngle}</p>
      </div>
      {agenticPost.research.trendingHashtags.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
            {t("review_screen.trending_hashtags")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {agenticPost.research.trendingHashtags.map((h) => (
              <span
                key={h}
                className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs"
              >
                #{h}
              </span>
            ))}
          </div>
        </div>
      )}
      {agenticPost.research.keyFacts.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
            {t("review_screen.key_facts")}
          </p>
          <ul className="space-y-1">
            {agenticPost.research.keyFacts.map((f, i) => (
              <li key={i} className="text-muted-foreground flex gap-1.5 text-xs">
                <span className="text-primary shrink-0">•</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
          {t("review_screen.content_plan")}
        </p>
        <p className="text-muted-foreground">{agenticPost.plan.rationale}</p>
      </div>
    </>
  );
}
