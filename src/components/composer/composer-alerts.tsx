"use client";

import { CalendarDays, CheckCircle2, Info, Sparkles, X as XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ComposerOnboardingHint } from "@/components/composer/composer-onboarding-hint";
import type { TweetDraft } from "@/components/composer/composer-types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { XSubscriptionBadge, type XSubscriptionTier } from "@/components/ui/x-subscription-badge";
import { canPostLongContent } from "@/lib/services/x-subscription";

interface ComposerAlertsProps {
  tweets: TweetDraft[];
  effectiveTier: XSubscriptionTier | null;
  userHandle: string;
  pendingDraftRestore: TweetDraft[] | null;
  onAcceptDraftRestore: () => void;
  onDiscardDraftRestore: () => void;
  sourceAttribution: { handle?: string; url?: string; label?: string } | null;
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
  const t = useTranslations("compose");

  return (
    <>
      <ComposerOnboardingHint />

      {pendingDraftRestore && (
        <Alert className="border-primary/30 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm">{t("alerts.draft_restore_message")}</span>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="outline" onClick={onDiscardDraftRestore}>
                {t("alerts.discard")}
              </Button>
              <Button size="sm" onClick={onAcceptDraftRestore}>
                {t("alerts.restore")}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {sourceAttribution && (
        <div className="border-border/50 bg-muted/30 flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
            {sourceAttribution.label ? (
              <span className="text-foreground font-medium">{sourceAttribution.label}</span>
            ) : (
              <>
                {t("alerts.inspired_by")}{" "}
                <a
                  href={sourceAttribution.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground font-medium hover:underline"
                >
                  @{sourceAttribution.handle}
                </a>
              </>
            )}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onDismissSourceAttribution}
            aria-label={t("alerts.dismiss_attribution")}
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
                {t("alerts.topic_label")}{" "}
                <span className="text-foreground font-medium">{calendarMeta.topic}</span>
              </span>
            )}
            {calendarMeta.topic && calendarMeta.tone && (
              <span className="text-border/60 hidden sm:inline">·</span>
            )}
            {calendarMeta.tone && (
              <span>
                {t("alerts.tone_label")}{" "}
                <span className="text-foreground font-medium capitalize">{calendarMeta.tone}</span>
              </span>
            )}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onDismissCalendarMeta}
            aria-label={t("alerts.dismiss_calendar_hint")}
          >
            <XIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </Button>
        </div>
      )}

      {tweets.some((t) => t.content.length > 280) &&
        canPostLongContent(effectiveTier) &&
        effectiveTier && (
          <Alert className="border-success-6 bg-success-3 text-success-11">
            <CheckCircle2 className="text-success-11 h-4 w-4" />
            <AlertDescription className="text-success-11 flex items-center gap-2">
              <XSubscriptionBadge tier={effectiveTier} size="md" />
              <span>{t("alerts.long_post_support", { handle: userHandle })}</span>
            </AlertDescription>
          </Alert>
        )}

      {tweets.some((t) => t.content.length > 280) && !canPostLongContent(effectiveTier) && (
        <Alert className="border-warning-6 bg-warning-3 text-warning-11">
          <Info className="text-warning-11 h-4 w-4" />
          <AlertDescription className="text-warning-11 space-y-1">
            <p>
              <span className="font-medium">{t("alerts.x_premium_required_title")}</span>
            </p>
            <p>{t("alerts.x_premium_required_body")}</p>
            <p className="text-warning-11/80">{t("alerts.x_premium_tip")}</p>
          </AlertDescription>
        </Alert>
      )}

      {tweets.length === 1 &&
        tweets[0]!.content.length > 2000 &&
        canPostLongContent(effectiveTier) &&
        effectiveTier && (
          <Alert className="border-warning-6 bg-warning-3 text-warning-11">
            <Info className="text-warning-11 h-4 w-4" />
            <AlertDescription className="text-warning-11">
              {t("alerts.post_exceeds_2000")}
            </AlertDescription>
          </Alert>
        )}

      {/* Mixed tier note: accounts have different subscription levels */}
      {hasMixedTiers && (
        <div className="border-border/50 bg-muted/30 text-muted-foreground flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs">
          <Info className="h-3 w-3 shrink-0" />
          <span>{t("alerts.mixed_tier_note")}</span>
        </div>
      )}
    </>
  );
}
