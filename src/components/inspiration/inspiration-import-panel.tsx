"use client";

import {
  AlertCircle,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Lightbulb,
  Loader2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { AdaptationPanel } from "@/components/inspiration/adaptation-panel";
import { ImportedTweetCard } from "@/components/inspiration/imported-tweet-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { ImportedTweetContext } from "@/lib/services/tweet-importer";

interface InspirationImportPanelProps {
  tweetUrl: string;
  isValidUrl: boolean;
  isLoading: boolean;
  importElapsed: number;
  importedData: ImportedTweetContext | null;
  showThreadContext: boolean;
  error: string | null;
  successMessage: string | null;
  isBookmarking: boolean;
  onUrlChange: (value: string) => void;
  onImport: () => void;
  onBookmark: () => void;
  onClear: () => void;
  onToggleThread: () => void;
  onSendToComposer: (tweets: string[]) => void;
}

export function InspirationImportPanel({
  tweetUrl,
  isValidUrl,
  isLoading,
  importElapsed,
  importedData,
  showThreadContext,
  error,
  successMessage,
  isBookmarking,
  onUrlChange,
  onImport,
  onBookmark,
  onClear,
  onToggleThread,
  onSendToComposer,
}: InspirationImportPanelProps) {
  const t = useTranslations("inspiration");

  return (
    <div className="space-y-6">
      {/* URL Input Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tweet-url">{t("paste_url")}</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="tweet-url"
                  type="url"
                  placeholder={t("url_placeholder")}
                  value={tweetUrl}
                  onChange={(e) => onUrlChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && isValidUrl) {
                      onImport();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={onImport}
                  disabled={!isValidUrl || isLoading}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      {t("importing", { seconds: importElapsed })}
                    </>
                  ) : (
                    <>
                      {t("import_button")}
                      <ArrowRight className="ms-2 h-4 w-4 rtl:scale-x-[-1]" />
                    </>
                  )}
                </Button>
              </div>
              {tweetUrl.length >= 5 && !isValidUrl && (
                <p className="text-destructive flex items-center gap-1.5 text-xs">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {t("invalid_url")}
                </p>
              )}
            </div>

            {/* Success Message */}
            {successMessage && (
              <Alert className="border-success-6 bg-success-3">
                <CheckCircle2 className="text-success-11 h-4 w-4" />
                <AlertDescription className="text-success-11">{successMessage}</AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="mb-4 h-4 w-3/4" />
              <Skeleton className="mb-2 h-4 w-1/2" />
              <Skeleton className="mb-4 h-20 w-full" />
              <Skeleton className="h-12 w-1/3" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="mb-4 h-6 w-full" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Imported Tweet + Adaptation Panel */}
      {importedData && !isLoading && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Imported Tweet */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2 sm:items-center">
              <div>
                <h2 className="text-base font-semibold sm:text-lg">{t("imported_tweet")}</h2>
                <p className="text-muted-foreground text-xs sm:text-sm">{t("original_content")}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onBookmark}
                  disabled={isBookmarking}
                  aria-label={isBookmarking ? t("saving") : t("bookmark")}
                  className="h-10 w-10"
                >
                  <Bookmark className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onClear}
                  aria-label={t("clear")}
                  className="h-10 w-10"
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
            <ImportedTweetCard
              tweet={importedData.originalTweet}
              parentTweets={importedData.parentTweets}
              topReplies={importedData.topReplies}
              quotedTweet={importedData.quotedTweet ?? undefined}
              showThreadContext={showThreadContext}
              onToggleThread={onToggleThread}
            />
          </div>

          {/* Right: Adaptation Panel */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">{t("adapt_content")}</h2>
              <p className="text-muted-foreground text-sm">{t("adapt_description")}</p>
            </div>
            {/*
              Char counting in AdaptationPanel/ManualEditor uses simple `.length`
              (max 280). A weighted hook exists (src/hooks/use-tweet-char-count.ts
              + src/lib/tweet-char.ts) — adopting it here would change displayed
              counts (behavior delta), so it is deliberately NOT migrated in this
              refactor. Left for a future intentional refinement.
            */}
            <AdaptationPanel
              sourceTweet={importedData.originalTweet}
              threadContext={[
                ...importedData.parentTweets.map((tw) => tw.text),
                ...importedData.topReplies.map((tw) => tw.text),
              ]}
              onSendToComposer={onSendToComposer}
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!importedData && !isLoading && !error && (
        <EmptyState
          icon={<Lightbulb className="h-8 w-8" />}
          iconBgClass="from-primary/10 to-primary/5 border-primary/10 border bg-gradient-to-br text-primary"
          title={t("no_tweet_imported")}
          description={t("no_tweet_description")}
          className="py-12 sm:py-16"
        />
      )}
    </div>
  );
}
