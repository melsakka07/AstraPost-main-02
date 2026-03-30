"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  ListOrdered,
  PlusCircle,
  ShieldCheck,
} from "lucide-react";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { BulkApproveButton } from "@/components/queue/bulk-approve-button";
import { CancelPostButton } from "@/components/queue/cancel-post-button";
import { PostApprovalActions } from "@/components/queue/post-approval-actions";
import { QueueRealtimeListener } from "@/components/queue/queue-realtime-listener";
import { RescheduleInlineDialog } from "@/components/queue/reschedule-inline-dialog";
import { RetryPostButton } from "@/components/queue/retry-post-button";
import { ThreadCollapsible } from "@/components/queue/thread-collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { UpgradeBanner } from "@/components/ui/upgrade-banner";
import { XSubscriptionBadge, type XSubscriptionTier } from "@/components/ui/x-subscription-badge";
import { canPostLongContent } from "@/lib/services/x-subscription";

// Q4 — maps known failReason substrings to a contextual tip
function getFailureTip(
  failReason: string | null,
  tier?: XSubscriptionTier | null
): { tip: string; href?: string; isCharLimit?: boolean; isTierLimit?: boolean; postId?: string } | null {
  if (!failReason) return null;
  const r = failReason.toLowerCase();
  if (r.includes("tier_limit_exceeded")) {
    return {
      tip: failReason,
      isCharLimit: true,
      isTierLimit: true,
    };
  }
  if (r.includes("authorization expired") || r.includes("401")) {
    return {
      tip: "Your X token expired. Reconnect your account to fix this.",
      href: "/dashboard/settings",
    };
  }
  if (r.includes("forbidden") || r.includes("403") || r.includes("tweet.write")) {
    return {
      tip: "Missing tweet.write permission. Reconnect your X account to grant it.",
      href: "/dashboard/settings",
    };
  }
  if (r.includes("rate limit") || r.includes("429")) {
    return { tip: "X rate limit hit. The post will retry automatically soon." };
  }
  if (r.includes("duplicate")) {
    return { tip: "X rejected this as a duplicate tweet. Edit the content before retrying." };
  }
  if (r.includes("too long") || r.includes("character") || r.includes("length") || r.includes("280")) {
    if (canPostLongContent(tier)) {
      return {
        tip: "This post failed despite your paid subscription. Try refreshing your subscription status in Settings.",
        href: "/dashboard/settings",
        isCharLimit: true,
      };
    }
    return {
      tip: "This post exceeds the 280-character limit for free X accounts. Edit the content or upgrade to X Premium for long posts.",
      href: "/dashboard/settings",
      isCharLimit: true,
    };
  }
  return null;
}

const SCHEDULED_PAGE_SIZE = 20;

interface QueueContentProps {
  title: string;
  postCount: number;
  /** null means unlimited (∞) */
  postsPerMonthLimit: number | null;
  isNearLimit: boolean;
  scheduledPosts: any[];
  /** P1 — pagination props for scheduled posts */
  scheduledPage: number;
  hasMoreScheduled: boolean;
  totalScheduled: number;
  failedPosts: any[];
  awaitingApprovalPosts: any[];
  isOwner: boolean;
  role: string;
  currentUserId: string;
}

export function QueueContent({
  title,
  postCount,
  postsPerMonthLimit,
  isNearLimit,
  scheduledPosts,
  scheduledPage,
  hasMoreScheduled,
  totalScheduled,
  failedPosts,
  awaitingApprovalPosts,
  isOwner,
  role,
  currentUserId,
}: QueueContentProps) {
  // Q5 — density toggle as client state (no page reload)
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const isCompact = density === "compact";

  const approvalPostIds = awaitingApprovalPosts.map((p: any) => p.id as string);

  return (
    <DashboardPageWrapper
      icon={ListOrdered}
      title={title}
      description="Manage scheduled and failed posts."
      actions={
        <>
          <Badge variant="outline" className="text-muted-foreground">
            {postCount} / {postsPerMonthLimit === null ? "∞" : postsPerMonthLimit} this month
          </Badge>
          {/* Q5 — density toggle as client-side state buttons */}
          <div className="hidden items-center rounded-md border p-0.5 lg:flex">
            <Button
              variant={isCompact ? "ghost" : "secondary"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setDensity("comfortable")}
            >
              Comfortable
            </Button>
            <Button
              variant={isCompact ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setDensity("compact")}
            >
              Compact
            </Button>
          </div>
          <Button asChild>
            <Link href="/dashboard/compose">
              <PlusCircle className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">New Post</span>
            </Link>
          </Button>
        </>
      }
    >
      <QueueRealtimeListener />

      {isNearLimit && (
        <UpgradeBanner
          title={
            postsPerMonthLimit !== null && postCount >= postsPerMonthLimit
              ? "Monthly Limit Reached"
              : "Approaching Monthly Limit"
          }
          description={`You have used ${postCount} of your ${postsPerMonthLimit ?? "∞"} posts this month. Upgrade to Pro for unlimited scheduling.`}
        />
      )}

      {/* ── Awaiting Approval ── */}
      {awaitingApprovalPosts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight text-warning flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Awaiting Approval
            </h2>
            {/* Q3 — bulk actions for owners/admins */}
            {(isOwner || role === "admin") && approvalPostIds.length > 1 && (
              <div className="flex items-center gap-2">
                <BulkApproveButton postIds={approvalPostIds} action="approve" />
                <BulkApproveButton postIds={approvalPostIds} action="reject" />
              </div>
            )}
          </div>
          {awaitingApprovalPosts.map((post: any, index: number) => (
            <Card key={post.id} className="border-warning/30 bg-warning/10">
              <CardContent
                className={`flex flex-col gap-4 sm:flex-row sm:gap-6 ${isCompact ? "p-3 sm:p-4" : "p-4 sm:p-6"}`}
              >
                <div className="flex flex-row items-center gap-3 rounded-lg bg-warning/15 p-3 sm:flex-col sm:justify-center sm:p-4 sm:text-center sm:min-w-[100px]">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-warning sm:h-6 sm:w-6 sm:mb-2" />
                  <div className="text-xs text-muted-foreground">Needs Review</div>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-2 items-center">
                      <Badge
                        variant="outline"
                        className="border-warning/30 text-warning bg-warning/10"
                      >
                        {post.type === "thread" ? "Thread" : "Tweet"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        by {post.user.name}
                      </span>
                    </div>
                    {(isOwner || role === "admin") && (
                      <PostApprovalActions
                        postId={post.id}
                        ariaLabel={`post ${index + 1}: ${String(post.tweets[0]?.content ?? "").slice(0, 50)}`}
                      />
                    )}
                  </div>
                  <p
                    className={`${isCompact ? "line-clamp-4 text-sm" : "line-clamp-5"} whitespace-pre-wrap break-words`}
                  >
                    {post.tweets[0]?.content}
                  </p>
                  {/* Q2 — collapsible thread */}
                  <ThreadCollapsible tweets={post.tweets} isCompact={isCompact} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Scheduled Posts ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Scheduled Posts</h2>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/calendar">Open Calendar</Link>
        </Button>
      </div>

      {scheduledPosts.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-6 w-6" />}
          title="No scheduled posts yet"
          description="Create your first scheduled post to start filling your publishing queue."
          primaryAction={
            <Button asChild>
              <Link href="/dashboard/compose">Create Post</Link>
            </Button>
          }
          secondaryAction={
            <Button variant="outline" asChild>
              <Link href="/dashboard/drafts">Open Drafts</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {scheduledPosts.map((post: any, index: number) => (
            <Card key={post.id}>
              <CardContent
                className={`flex flex-col gap-4 sm:flex-row sm:gap-6 ${isCompact ? "p-3 sm:p-4" : "p-4 sm:p-6"}`}
              >
                <div className="flex flex-row items-center gap-3 rounded-lg bg-muted/50 p-3 sm:flex-col sm:justify-center sm:p-4 sm:text-center sm:min-w-[100px]">
                  <Clock className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6 sm:mb-1" />
                  <div>
                    <div className="text-sm font-bold">
                      {post.scheduledAt
                        ? new Date(post.scheduledAt).toLocaleDateString()
                        : "No Date"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {post.scheduledAt
                        ? new Date(post.scheduledAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-2 items-center">
                      <Badge variant="outline">
                        {post.type === "thread" ? "Thread" : "Tweet"}
                      </Badge>
                      <Badge variant="secondary">Scheduled</Badge>
                      {!isOwner && post.user.id !== currentUserId && (
                        <span className="text-xs text-muted-foreground">
                          by {post.user.name}
                        </span>
                      )}
                    </div>
                    {/* Q1 + Q6 */}
                    <div className="flex items-center gap-1">
                      <RescheduleInlineDialog
                        postId={post.id}
                        scheduledAt={post.scheduledAt}
                        ariaLabel={`Reschedule post ${index + 1}: ${String(post.tweets[0]?.content ?? "").slice(0, 50)}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Edit post ${index + 1}`}
                      >
                        <Link href={`/dashboard/compose?draft=${post.id}`}>
                          Edit
                        </Link>
                      </Button>
                      <CancelPostButton
                        postId={post.id}
                        ariaLabel={`Cancel scheduled post ${index + 1}: ${String(post.tweets[0]?.content ?? "").slice(0, 50)}`}
                      />
                    </div>
                  </div>
                  <p
                    className={`${isCompact ? "line-clamp-4 text-sm" : "line-clamp-5"} whitespace-pre-wrap break-words`}
                  >
                    {post.tweets[0]?.content}
                  </p>
                  {/* Q2 — collapsible thread */}
                  <ThreadCollapsible tweets={post.tweets} isCompact={isCompact} />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* P1 — pagination controls */}
          {totalScheduled > SCHEDULED_PAGE_SIZE && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                {scheduledPage * SCHEDULED_PAGE_SIZE + 1}–
                {Math.min((scheduledPage + 1) * SCHEDULED_PAGE_SIZE, totalScheduled)} of{" "}
                {totalScheduled} posts
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  disabled={scheduledPage === 0}
                  aria-label="Previous page of scheduled posts"
                >
                  <Link href={`?page=${scheduledPage - 1}`}>
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  disabled={!hasMoreScheduled}
                  aria-label="Next page of scheduled posts"
                >
                  <Link href={`?page=${scheduledPage + 1}`}>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Failed Posts ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Failed Posts</h2>
        {failedPosts.length > 0 && (
          <p className="hidden text-sm text-muted-foreground sm:block">
            Retry or edit failed content quickly
          </p>
        )}
      </div>

      {failedPosts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-success/30 bg-success/10 px-4 py-6 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <h3 className="text-sm font-semibold text-success">All clear!</h3>
          <p className="mt-1 text-xs text-success/70">
            No failed posts. All queue jobs are healthy.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {failedPosts.map((post: any, index: number) => {
            const isPaused = post.status === "paused_needs_reconnect";
            const tier = post.xAccount?.xSubscriptionTier as XSubscriptionTier | null | undefined;
            const tip = getFailureTip(post.failReason, tier);
            return (
              <Card key={post.id} className={isPaused ? "border-warning/30 bg-warning/5" : ""}>
                <CardContent
                  className={`flex flex-col gap-4 sm:flex-row sm:gap-6 ${isCompact ? "p-3 sm:p-4" : "p-4 sm:p-6"}`}
                >
                  <div className={`flex flex-row items-center gap-3 rounded-lg p-3 sm:flex-col sm:justify-center sm:p-4 sm:text-center sm:min-w-[100px] ${isPaused ? "bg-warning/10" : "bg-muted/50"}`}>
                    <AlertTriangle className={`h-5 w-5 shrink-0 sm:h-6 sm:w-6 sm:mb-2 ${isPaused ? "text-warning" : "text-destructive"}`} />
                    <div className="text-xs text-muted-foreground">{isPaused ? "Paused" : "Failed"}</div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex gap-2 items-center flex-wrap">
                        <Badge variant="outline">
                          {post.type === "thread" ? "Thread" : "Tweet"}
                        </Badge>
                        {isPaused ? (
                          <Badge variant="outline" className="border-warning/50 text-warning bg-warning/10">Waiting for reconnection</Badge>
                        ) : (
                          <Badge variant="destructive">{post.status}</Badge>
                        )}
                        {post.xAccount?.xUsername && (
                          <span className="text-xs text-muted-foreground">
                            @{post.xAccount.xUsername}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`Edit failed post ${index + 1}`}
                        >
                          <Link href={`/dashboard/compose?draft=${post.id}`}>
                            Edit
                          </Link>
                        </Button>
                        <RetryPostButton
                          postId={post.id}
                          ariaLabel={`Retry failed post ${index + 1}: ${String(post.tweets[0]?.content ?? "").slice(0, 50)}`}
                        />
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap break-words">
                      {post.tweets[0]?.content}
                    </p>
                    {/* Q4 — contextual failure tip */}
                    {post.failReason && (
                      <p className="break-words text-sm text-muted-foreground">
                        {post.failReason}
                      </p>
                    )}
                    {tip && (
                      <div className="flex flex-col gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                        <div className="flex items-start gap-1.5">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span className="flex items-center gap-2 flex-wrap">
                            {tip.isCharLimit && tier && <XSubscriptionBadge tier={tier} size="sm" />}
                            <span>
                              {tip.isTierLimit ? (
                                <>
                                  This post exceeds the character limit for your X account tier. Edit the content or convert to a thread.
                                </>
                              ) : (
                                tip.tip
                              )}{" "}
                              {tip.href && (
                                <Link
                                  href={tip.href}
                                  className="inline-flex items-center gap-0.5 underline underline-offset-2 font-medium"
                                >
                                  Go to Settings
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              )}
                            </span>
                          </span>
                        </div>
                        {tip.isTierLimit && (
                          <div className="flex items-center gap-2 ml-5">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="h-7 text-xs border-destructive/30 hover:bg-destructive/10"
                            >
                              <Link href={`/dashboard/compose?draft=${post.id}`}>
                                Edit Post
                              </Link>
                            </Button>
                            {post.type !== "thread" && (
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="h-7 text-xs border-destructive/30 hover:bg-destructive/10"
                              >
                                <Link href={`/dashboard/compose?draft=${post.id}&convert=thread`}>
                                  Convert to Thread
                                </Link>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Q2 — collapsible thread for failed posts */}
                    <ThreadCollapsible tweets={post.tweets} isCompact={isCompact} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardPageWrapper>
  );
}
