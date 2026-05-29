"use client";

import {
  BookmarkPlus,
  ChevronDown,
  Clock,
  FileText,
  Loader2,
  Send,
  X as XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { BestTimeSuggestions } from "@/components/composer/best-time-suggestions";
import {
  TargetAccountsSelect,
  type SocialAccountLite,
} from "@/components/composer/target-accounts-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ComposerPublishingPanelProps {
  scheduledDate: string;
  setScheduledDate: (v: string) => void;
  recurrencePattern: string;
  setRecurrencePattern: (v: string) => void;
  recurrenceEndDate: string;
  setRecurrenceEndDate: (v: string) => void;
  showAdvancedOptions: boolean;
  setShowAdvancedOptions: (v: boolean) => void;
  isSubmitting: boolean;
  hasContent: boolean;
  accounts: SocialAccountLite[];
  accountsLoading: boolean;
  targetAccountIds: string[];
  setTargetAccountIds: (v: string[]) => void;
  browserTimezone: string | null;
  onSubmit: (action: "draft" | "schedule" | "publish_now") => void;
  onOpenSaveTemplate: () => void;
}

export function ComposerPublishingPanel({
  scheduledDate,
  setScheduledDate,
  recurrencePattern,
  setRecurrencePattern,
  recurrenceEndDate,
  setRecurrenceEndDate,
  showAdvancedOptions,
  setShowAdvancedOptions,
  isSubmitting,
  hasContent,
  accounts,
  accountsLoading,
  targetAccountIds,
  setTargetAccountIds,
  browserTimezone,
  onSubmit,
  onOpenSaveTemplate,
}: ComposerPublishingPanelProps) {
  const t = useTranslations("compose");

  return (
    <Card>
      <CardContent className="space-y-3 px-3 pt-3 sm:space-y-4 sm:px-6 sm:pt-5">
        <p className="text-muted-foreground/70 text-xs font-medium">{t("label.publishing")}</p>

        {/* H2: Action context — shows what will happen before the user clicks */}
        <p className="text-muted-foreground text-center text-[10px] sm:text-xs">
          {scheduledDate ? (
            <>
              Scheduling for{" "}
              <span className="text-foreground font-medium">
                {new Date(scheduledDate).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
                {t("at_separator")}
                {new Date(scheduledDate).toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </>
          ) : (
            <>
              {t("posting_immediately_to")}{" "}
              <span className="text-foreground font-medium">
                {accounts.find((a) => targetAccountIds.includes(a.id))?.username
                  ? `@${accounts.find((a) => targetAccountIds.includes(a.id))?.username}`
                  : t("selected_account")}
              </span>
            </>
          )}
        </p>

        <div className="flex flex-col gap-1.5 sm:gap-2">
          {scheduledDate ? (
            /* Date is set — show Schedule as primary, Post Now as secondary */
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button
                        className="h-10 w-full text-sm font-semibold sm:h-11 sm:text-base"
                        onClick={() => onSubmit("schedule")}
                        disabled={isSubmitting || !hasContent}
                      >
                        {isSubmitting ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin sm:mr-2 sm:h-4 sm:w-4" />
                        ) : (
                          <Clock className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                        )}
                        {t("label.schedule")}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!hasContent && <TooltipContent>Add content to enable</TooltipContent>}
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button
                        variant="outline"
                        className="h-9 w-full text-sm sm:h-10"
                        onClick={() => onSubmit("publish_now")}
                        disabled={isSubmitting || !hasContent}
                      >
                        <Send className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                        {t("label.post_now")}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!hasContent && <TooltipContent>Add content to enable</TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            </>
          ) : (
            /* No date set — Post Now primary, Schedule reveals advanced options */
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button
                        className="h-10 w-full text-sm font-semibold sm:h-11 sm:text-base"
                        onClick={() => onSubmit("publish_now")}
                        disabled={isSubmitting || !hasContent}
                      >
                        {isSubmitting ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin sm:mr-2 sm:h-4 sm:w-4" />
                        ) : (
                          <Send className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                        )}
                        {t("label.post_now")}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!hasContent && <TooltipContent>Add content to enable</TooltipContent>}
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button
                        variant="outline"
                        className="h-9 w-full text-sm sm:h-10"
                        onClick={() => setShowAdvancedOptions(true)}
                        disabled={isSubmitting || !hasContent}
                      >
                        <Clock className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                        {t("label.schedule")}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!hasContent && <TooltipContent>Add content to enable</TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            </>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button
                    variant="outline"
                    className="h-9 w-full text-sm sm:h-10"
                    onClick={() => onSubmit("draft")}
                    disabled={isSubmitting || !hasContent}
                  >
                    <FileText className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                    {t("label.save_draft")}
                  </Button>
                </span>
              </TooltipTrigger>
              {!hasContent && <TooltipContent>Add content to enable</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Advanced Options disclosure */}
        <div className="border-t pt-3">
          <button
            type="button"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            aria-expanded={showAdvancedOptions}
            className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between text-xs font-medium transition-colors"
          >
            <span>{t("advanced_options")}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                showAdvancedOptions && "rotate-180"
              )}
            />
          </button>
          {showAdvancedOptions && (
            <div className="animate-in fade-in slide-in-from-top-2 space-y-4 pt-3">
              {/* Target account selector — only when multiple accounts available */}
              {accounts.length > 1 && (
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="post-accounts" className="text-xs sm:text-sm">
                    {t("label.post_to_accounts")}
                  </Label>
                  <TargetAccountsSelect
                    value={targetAccountIds}
                    onChange={setTargetAccountIds}
                    accounts={accounts}
                    loading={accountsLoading}
                  />
                </div>
              )}

              {/* Schedule section */}
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="schedule-date" className="text-xs sm:text-sm">
                    {t("label.schedule_for")}
                  </Label>
                  {scheduledDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground h-auto px-2 py-0.5 text-[10px] sm:text-xs"
                      onClick={() => {
                        setScheduledDate("");
                        setRecurrencePattern("none");
                        setRecurrenceEndDate("");
                      }}
                    >
                      {t("label.cancel")}
                      <XIcon className="ml-1 h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="bg-muted/30 space-y-1.5 rounded-lg p-2 sm:space-y-2 sm:p-3">
                  <DateTimePicker
                    id="schedule-date"
                    value={scheduledDate}
                    onChange={(val) => {
                      if (!val) {
                        setScheduledDate("");
                        setRecurrencePattern("none");
                        setRecurrenceEndDate("");
                      } else {
                        setScheduledDate(val);
                      }
                    }}
                  />
                  <BestTimeSuggestions onSelect={setScheduledDate} hideHeader />
                </div>
                {browserTimezone && (
                  <p className="text-muted-foreground/60 text-[10px] sm:text-xs">
                    {t("label.times_are_in")}{" "}
                    <span className="text-foreground font-medium">{browserTimezone}</span>{" "}
                    <span className="tabular-nums">
                      (UTC
                      {(() => {
                        const off = -new Date().getTimezoneOffset();
                        const h = Math.floor(Math.abs(off) / 60);
                        const m = Math.abs(off) % 60;
                        return `${off >= 0 ? "+" : "-"}${h}${m > 0 ? `:${String(m).padStart(2, "0")}` : ""}`;
                      })()}
                      )
                    </span>
                  </p>
                )}

                {scheduledDate && (
                  <div className="grid grid-cols-1 gap-2 pt-1.5 sm:grid-cols-2 sm:pt-2">
                    <div className="space-y-1">
                      <label className="text-muted-foreground text-xs font-medium">
                        {t("label.repeat")}
                      </label>
                      <Select value={recurrencePattern} onValueChange={setRecurrencePattern}>
                        <SelectTrigger className="h-8 sm:h-9">
                          <SelectValue placeholder={t("label.none")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t("label.none")}</SelectItem>
                          <SelectItem value="daily">{t("label.daily")}</SelectItem>
                          <SelectItem value="weekly">{t("label.weekly")}</SelectItem>
                          <SelectItem value="monthly">{t("label.monthly")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {recurrencePattern !== "none" && (
                      <div className="space-y-1">
                        <label className="text-muted-foreground text-xs font-medium">
                          {t("label.end_date")}
                        </label>
                        <DatePicker
                          className="h-8 sm:h-9"
                          value={recurrenceEndDate}
                          onChange={setRecurrenceEndDate}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Save as Template */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground h-9 w-full justify-start text-xs sm:h-9 sm:text-sm"
                        onClick={onOpenSaveTemplate}
                        disabled={isSubmitting || !hasContent}
                      >
                        <BookmarkPlus className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                        {t("label.save_template")}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!hasContent && <TooltipContent>Add content to enable</TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
