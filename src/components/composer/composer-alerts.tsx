import { CalendarDays, CheckCircle2, Info, Sparkles, X as XIcon } from "lucide-react";
import { ComposerOnboardingHint } from "@/components/composer/composer-onboarding-hint";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { XSubscriptionBadge, type XSubscriptionTier } from "@/components/ui/x-subscription-badge";
import { canPostLongContent } from "@/lib/services/x-subscription";

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  images?: string[];
  siteName?: string;
}

export interface TweetDraft {
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

interface ComposerAlertsProps {
  tweets: TweetDraft[];
  effectiveTier: XSubscriptionTier | null;
  userHandle: string;
  pendingDraftRestore: TweetDraft[] | null;
  onAcceptDraftRestore: () => void;
  onDiscardDraftRestore: () => void;
  sourceAttribution: { handle: string; url: string } | null;
  onDismissSourceAttribution: () => void;
  calendarMeta: { tone: string; topic: string } | null;
  onDismissCalendarMeta: () => void;
  hasMixedTiers: boolean;
}

export function ComposerAlerts({
  tweets,
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
}: ComposerAlertsProps) {
  return (
    <>
      <ComposerOnboardingHint />

      {pendingDraftRestore && (
        <Alert className="border-primary/30 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm">
              You have an unsaved draft from a previous session. Would you like to restore it?
            </span>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="outline" onClick={onDiscardDraftRestore}>
                Discard
              </Button>
              <Button size="sm" onClick={onAcceptDraftRestore}>
                Restore
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

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
            onClick={onDismissSourceAttribution}
            aria-label="Dismiss attribution"
          >
            <XIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </Button>
        </div>
      )}

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
                <span className="text-foreground font-medium capitalize">{calendarMeta.tone}</span>
              </span>
            )}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onDismissCalendarMeta}
            aria-label="Dismiss calendar hint"
          >
            <XIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </Button>
        </div>
      )}

      {tweets.some((t) => t.content.length > 280) &&
        canPostLongContent(effectiveTier) &&
        effectiveTier && (
          <Alert className="border-success/40 bg-success/5 text-success dark:text-success">
            <CheckCircle2 className="text-success h-4 w-4" />
            <AlertDescription className="text-success flex items-center gap-2">
              <XSubscriptionBadge tier={effectiveTier} size="md" />
              <span>
                Your account ({userHandle}) supports long posts — this will publish normally with up
                to 2,000 characters.
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
              One or more of your tweets exceeds 280 characters. Standard X accounts are limited to
              280 characters per tweet — posts beyond this limit will only publish successfully on{" "}
              <span className="font-medium">X Premium</span> accounts. If you&apos;re on a standard
              account, these tweets will fail and appear as errors in your queue.
            </p>
            <p className="text-amber-600/80 dark:text-amber-400/80">
              Tip: Use the &quot;Convert to Thread&quot; button below to split your content into
              multiple tweets under 280 characters each.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {tweets.length === 1 &&
        tweets[0]!.content.length > 2000 &&
        canPostLongContent(effectiveTier) &&
        effectiveTier && (
          <Alert className="border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400">
            <Info className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              <span className="font-medium">Post exceeds 2,000 characters.</span> While your X
              Premium account supports up to 25,000 characters, posts beyond 2,000 characters tend
              to see significantly lower engagement. Consider trimming your content or converting to
              a thread.
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
    </>
  );
}
