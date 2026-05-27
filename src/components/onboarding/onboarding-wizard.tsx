"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Globe,
  Languages,
  Lightbulb,
  ListOrdered,
  Loader2,
  PenTool,
  Rocket,
  Twitter,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import twitter from "twitter-text";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { clientLogger } from "@/lib/client-logger";
import { LANGUAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";

function getSteps(t: (key: string) => string): {
  id: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}[] {
  // Collapsed flow: 1=Connect, 2=Compose (with inline preferences), 3=Schedule, 4=Done
  return [
    {
      id: 1,
      title: t("onboarding.steps.connect"),
      icon: Twitter,
      description: t("onboarding.steps.confirm_account"),
    },
    {
      id: 2,
      title: t("onboarding.steps.compose"),
      icon: PenTool,
      description: t("onboarding.steps.compose_description"),
    },
    {
      id: 3,
      title: t("onboarding.steps.schedule"),
      icon: Calendar,
      description: t("onboarding.steps.pick_time"),
    },
    {
      id: 4,
      title: t("onboarding.steps.done"),
      icon: Rocket,
      description: t("onboarding.steps.explore_ai_description"),
    },
  ];
}

export function OnboardingWizard() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();

  const steps = getSteps(t);
  const t_dt = useTranslations("date_time_picker");

  // Stable idempotency key for the lifetime of this wizard mount.
  // Used on the Step 2 (Compose) POST to /api/posts so that re-submission
  // via Back→Continue returns the existing draft instead of creating a duplicate.
  const onboardingIdemKey = useRef<string>(crypto.randomUUID());

  // Time options grouped by period — translated via date_time_picker namespace
  const TIME_OPTIONS = useMemo(() => {
    const formatHour = (h24: string) => {
      const hour = parseInt(h24.split(":")[0]!, 10);
      const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const period = hour < 12 ? t_dt("am") : t_dt("pm");
      return `${h12}:00 ${period}`;
    };
    return [
      {
        label: t_dt("time_group_morning"),
        options: ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00"].map((v) => ({
          value: v,
          label: formatHour(v),
        })),
      },
      {
        label: t_dt("time_group_afternoon"),
        options: ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00"].map((v) => ({
          value: v,
          label: formatHour(v),
        })),
      },
      {
        label: t_dt("time_group_evening"),
        options: ["18:00", "19:00", "20:00", "21:00"].map((v) => ({
          value: v,
          label: formatHour(v),
        })),
      },
      {
        label: t_dt("time_group_night"),
        options: ["22:00", "23:00", "00:00"].map((v) => ({
          value: v,
          label: formatHour(v),
        })),
      },
    ];
  }, [t_dt]);

  const TIMEZONE_GROUPS = useMemo(
    () => [
      {
        label: t("onboarding.timezone_group_mena"),
        zones: [
          { value: "Asia/Riyadh", label: "Saudi Arabia — Riyadh (GMT+3)" },
          { value: "Asia/Dubai", label: "UAE — Dubai (GMT+4)" },
          { value: "Asia/Qatar", label: "Qatar — Doha (GMT+3)" },
          { value: "Asia/Kuwait", label: "Kuwait (GMT+3)" },
          { value: "Asia/Bahrain", label: "Bahrain (GMT+3)" },
          { value: "Asia/Muscat", label: "Oman — Muscat (GMT+4)" },
          { value: "Africa/Cairo", label: "Egypt — Cairo (GMT+2/3)" },
          { value: "Asia/Baghdad", label: "Iraq — Baghdad (GMT+3)" },
          { value: "Asia/Beirut", label: "Lebanon — Beirut (GMT+2/3)" },
          { value: "Asia/Amman", label: "Jordan — Amman (GMT+2/3)" },
          { value: "Asia/Jerusalem", label: "Palestine/Israel (GMT+2/3)" },
          { value: "Africa/Casablanca", label: "Morocco — Casablanca (GMT+1)" },
          { value: "Africa/Algiers", label: "Algeria (GMT+1)" },
          { value: "Africa/Tunis", label: "Tunisia (GMT+1)" },
          { value: "Africa/Tripoli", label: "Libya (GMT+2)" },
          { value: "Asia/Aden", label: "Yemen — Aden (GMT+3)" },
        ],
      },
      {
        label: t("onboarding.timezone_group_europe"),
        zones: [
          { value: "Europe/London", label: "UK — London (GMT/BST)" },
          { value: "Europe/Paris", label: "France — Paris (GMT+1/2)" },
          { value: "Europe/Berlin", label: "Germany — Berlin (GMT+1/2)" },
          { value: "Europe/Rome", label: "Italy — Rome (GMT+1/2)" },
          { value: "Europe/Madrid", label: "Spain — Madrid (GMT+1/2)" },
          { value: "Europe/Istanbul", label: "Turkey — Istanbul (GMT+3)" },
          { value: "Europe/Moscow", label: "Russia — Moscow (GMT+3)" },
        ],
      },
      {
        label: t("onboarding.timezone_group_americas"),
        zones: [
          { value: "America/New_York", label: "US — New York (EST/EDT)" },
          { value: "America/Chicago", label: "US — Chicago (CST/CDT)" },
          { value: "America/Denver", label: "US — Denver (MST/MDT)" },
          { value: "America/Los_Angeles", label: "US — Los Angeles (PST/PDT)" },
          { value: "America/Toronto", label: "Canada — Toronto (EST/EDT)" },
          { value: "America/Vancouver", label: "Canada — Vancouver (PST/PDT)" },
          { value: "America/Sao_Paulo", label: "Brazil — São Paulo (GMT-3)" },
        ],
      },
      {
        label: t("onboarding.timezone_group_asia_pacific"),
        zones: [
          { value: "Asia/Kolkata", label: "India (IST, GMT+5:30)" },
          { value: "Asia/Karachi", label: "Pakistan — Karachi (GMT+5)" },
          { value: "Asia/Dhaka", label: "Bangladesh (GMT+6)" },
          { value: "Asia/Singapore", label: "Singapore (GMT+8)" },
          { value: "Asia/Tokyo", label: "Japan — Tokyo (GMT+9)" },
          { value: "Asia/Shanghai", label: "China — Shanghai (GMT+8)" },
          { value: "Australia/Sydney", label: "Australia — Sydney (AEDT)" },
        ],
      },
      {
        label: t("onboarding.timezone_group_africa"),
        zones: [
          { value: "Africa/Lagos", label: "Nigeria — Lagos (GMT+1)" },
          { value: "Africa/Nairobi", label: "Kenya — Nairobi (GMT+3)" },
          { value: "Africa/Johannesburg", label: "South Africa (GMT+2)" },
          { value: "Africa/Accra", label: "Ghana — Accra (GMT)" },
        ],
      },
    ],
    [t]
  );

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Holds the in-flight onboarding-complete API promise so all final-step
  // navigation can await it before doing a hard reload.
  const onboardingCompleteRef = useRef<Promise<void> | null>(null);

  // Preferences (now inline on Compose step)
  const [prefLanguage, setPrefLanguage] = useState("ar");
  const [prefTimezone, setPrefTimezone] = useState("Asia/Riyadh");
  const [prefsPopoverOpen, setPrefsPopoverOpen] = useState(false);

  // X Account State
  const [xAccounts, setXAccounts] = useState<
    Array<{
      id: string;
      xUsername: string;
      xDisplayName: string | null;
      xAvatarUrl: string | null;
      isDefault: boolean;
    }>
  >([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Post State
  const [tweetContent, setTweetContent] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);
  // Tracks which post id has already been scheduled/published in this session
  // so going Back to Schedule and pressing Continue again does not re-PATCH.
  const [scheduledPostId, setScheduledPostId] = useState<string | null>(null);

  // Char counter thresholds matching tweet-card.tsx
  const tweetWeightedLength = twitter.parseTweet(tweetContent).weightedLength;
  const isOverStandardLimit = tweetWeightedLength > 280;
  const isOverHardLimit = tweetWeightedLength > 1000;

  useEffect(() => {
    // Auto-detect browser timezone
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setPrefTimezone(detected);
    } catch {
      // fall back to default Asia/Riyadh
    }

    // Auto-detect browser language → Arabic if browser is Arabic, else English
    try {
      const navLang = typeof navigator !== "undefined" ? navigator.language : "";
      if (navLang.startsWith("ar")) {
        setPrefLanguage("ar");
      } else {
        setPrefLanguage("en");
      }
    } catch {
      // keep default
    }

    const stepParam = searchParams.get("step");
    if (stepParam) {
      const step = parseInt(stepParam);
      if (step >= 1 && step <= steps.length) setCurrentStep(step);
    }
  }, [searchParams, steps]);

  // Fetch connected X accounts; auto-skip Step 1 when an account is already connected.
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch("/api/x/accounts");
        if (res.ok) {
          const data = await res.json();
          const accounts = data.accounts || [];
          setXAccounts(accounts);
          if (accounts.length > 0 && currentStep === 1 && !searchParams.get("step")) {
            setCurrentStep(2);
          }
        }
      } catch (error) {
        clientLogger.error("Failed to fetch X accounts", {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setLoadingAccounts(false);
      }
    };
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Combine date + time into an ISO string */
  const getScheduledISO = (): string | null => {
    if (!scheduledDate) return null;
    const [year, month, day] = scheduledDate.split("-").map(Number);
    const [hour, minute] = scheduledTime.split(":").map(Number);
    const d = new Date(year!, month! - 1, day!, hour!, minute!, 0);
    return d.toISOString();
  };

  // Mark onboarding complete as soon as the last step is reached. Store the
  // promise in a ref so navigateAfterOnboarding() can await it before doing
  // a hard reload — this eliminates the race condition where the layout
  // queries the DB before the API response is committed.
  useEffect(() => {
    if (currentStep === steps.length) {
      onboardingCompleteRef.current = fetch("/api/user/onboarding-complete", { method: "POST" })
        .then((res) => {
          if (!res.ok) {
            toast.error(t("onboarding.save_error"));
          }
        })
        .catch(() => {
          toast.error(t("onboarding.save_error"));
        });
    }
  }, [currentStep, steps, t]);

  // All final-step navigation must go through here.
  // Awaiting the promise ensures onboardingCompleted is committed to the DB
  // before the hard reload causes dashboard/layout.tsx to re-check it.
  // Using window.location.href (hard nav) instead of <Link> is essential —
  // client-side navigation is too fast and would hit the layout before the
  // DB write completes.
  const navigateAfterOnboarding = async (href: string) => {
    if (onboardingCompleteRef.current) {
      await onboardingCompleteRef.current;
    }
    window.location.href = href;
  };

  // Auto-redirect from final step after 2s
  useEffect(() => {
    if (currentStep !== steps.length) return;
    const timer = setTimeout(() => {
      void navigateAfterOnboarding("/dashboard?tour=true");
    }, 2000);
    return () => clearTimeout(timer);
  }, [currentStep, steps.length]);

  const handleSkipOnboarding = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/onboarding/skip", { method: "POST" });
      if (!res.ok) {
        toast.error(t("onboarding.skip_failed"));
        setLoading(false);
        return;
      }
      window.location.href = "/dashboard";
    } catch (error) {
      clientLogger.error("Failed to skip onboarding", {
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error(t("onboarding.skip_failed"));
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: prefTimezone, language: prefLanguage }),
      });
      if (!res.ok) {
        toast.error(t("onboarding.prefs_failed"));
      }
    } catch (error) {
      clientLogger.error("Failed to save preferences", {
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error(t("onboarding.prefs_failed"));
    }
  };

  const handleSendNow = async () => {
    setLoading(true);
    try {
      if (createdPostId && scheduledPostId !== createdPostId) {
        const res = await fetch(`/api/posts/${createdPostId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "publish_now" }),
        });
        if (!res.ok) throw new Error("Failed to publish");
        setScheduledPostId(createdPostId);
        toast.success(t("onboarding.post_queued"));
      }
      setCurrentStep(4);
    } catch {
      toast.error(t("onboarding.post_failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      if (currentStep === 1) {
        // Step 1 — X Account confirmation (just continue)
        setCurrentStep(2);
      } else if (currentStep === 2) {
        // Step 2 — Compose (idempotent draft create/update)
        if (!tweetContent.trim()) {
          toast.error(t("onboarding.write_something"));
          setLoading(false);
          return;
        }
        if (isOverHardLimit) {
          toast.error(
            t("onboarding.tweet_too_long", {
              current: tweetWeightedLength,
              max: 1000,
            })
          );
          setLoading(false);
          return;
        }

        if (createdPostId === null) {
          // First-time draft create — send idempotency key so server-side
          // replay protection collapses any accidental double-POST.
          const res = await fetch("/api/posts", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": onboardingIdemKey.current,
            },
            body: JSON.stringify({
              tweets: [{ content: tweetContent }],
              action: "draft",
            }),
          });
          if (!res.ok) throw new Error("Failed to create draft");
          const data = await res.json();
          setCreatedPostId(data.postIds[0]);
        } else {
          // Returning to compose after Back — update existing draft in place.
          const res = await fetch(`/api/posts/${createdPostId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tweets: [{ content: tweetContent }],
              action: "draft",
            }),
          });
          if (!res.ok) throw new Error("Failed to update draft");
        }
        setCurrentStep(3);
      } else if (currentStep === 3) {
        // Step 3 — Schedule. Skip the PATCH if we have already scheduled
        // this exact post (prevents duplicate schedule via Back→Continue).
        if (createdPostId && scheduledPostId === createdPostId) {
          setCurrentStep(4);
          return;
        }
        const iso = getScheduledISO();
        if (!iso) {
          toast.error(t("onboarding.select_date"));
          setLoading(false);
          return;
        }
        if (createdPostId) {
          const res = await fetch(`/api/posts/${createdPostId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "schedule", scheduledAt: iso }),
          });
          if (!res.ok) throw new Error("Failed to schedule");
          setScheduledPostId(createdPostId);
        }
        setCurrentStep(4);
      } else if (currentStep === 4) {
        // Final step — go to dashboard with tour enabled
        await navigateAfterOnboarding("/dashboard?tour=true");
      }
    } catch (error) {
      clientLogger.error("Onboarding step failed", {
        step: currentStep,
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error(t("onboarding.something_wrong"));
    } finally {
      setLoading(false);
    }
  };

  // Lookup helpers for the inline preferences strip
  const languageLabel = useMemo(
    () => LANGUAGES.find((l) => l.code === prefLanguage)?.label ?? prefLanguage,
    [prefLanguage]
  );
  const timezoneLabel = useMemo(() => {
    for (const group of TIMEZONE_GROUPS) {
      const z = group.zones.find((zone) => zone.value === prefTimezone);
      if (z) return z.label;
    }
    return prefTimezone;
  }, [prefTimezone, TIMEZONE_GROUPS]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-center text-3xl font-bold">{t("onboarding.title")}</h1>
        <p className="text-muted-foreground text-center">{t("onboarding.subtitle")}</p>
      </div>

      {/* Mobile compact stepper */}
      <div className="text-muted-foreground mb-6 flex items-center gap-2 text-sm md:hidden">
        <span className="text-foreground font-medium">
          {t("onboarding.step_x_of_y", { current: currentStep, total: steps.length })}
        </span>
        <span aria-hidden="true">·</span>
        <span>{steps[currentStep - 1]!.title}</span>
      </div>

      {/* Desktop progress stepper */}
      <div className="relative mb-12 hidden items-center justify-between md:flex">
        <div className="bg-muted absolute top-1/2 left-0 -z-10 h-1 w-full" />
        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          return (
            <div key={step.id} className="bg-background flex flex-col items-center px-2">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted
                    ? "bg-primary border-primary text-primary-foreground"
                    : isCurrent
                      ? "border-primary text-primary"
                      : "border-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-sm font-medium",
                  isCurrent ? "text-primary" : "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="relative flex min-h-[300px] flex-col border-2 shadow-lg md:min-h-[400px]">
        {/* Single top-right Skip link (replaces the two CardFooter skip buttons) */}
        {currentStep < steps.length && (
          <button
            type="button"
            onClick={handleSkipOnboarding}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground absolute end-4 top-3 text-xs underline-offset-2 hover:underline disabled:opacity-50"
          >
            {t("onboarding.skip")}
          </button>
        )}

        <CardHeader className="bg-muted/20 border-b text-center">
          <CardTitle className="text-2xl">{steps[currentStep - 1]!.title}</CardTitle>
          <CardDescription>{steps[currentStep - 1]!.description}</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col items-center justify-center space-y-6 p-4 md:p-8">
          {/* Step 1 — X Account Confirmation (auto-skipped when account exists) */}
          {currentStep === 1 && (
            <div className="w-full max-w-md space-y-6 text-center">
              {loadingAccounts ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="text-primary h-8 w-8 animate-spin" />
                  <p className="text-muted-foreground">{t("onboarding.loading_account")}</p>
                </div>
              ) : xAccounts.length > 0 ? (
                <>
                  <div className="bg-primary/5 mb-2 inline-block rounded-full p-6">
                    <Twitter className="text-primary h-12 w-12" />
                  </div>
                  <h3 className="text-xl font-bold">{t("onboarding.account_connected")}</h3>
                  <p className="text-muted-foreground">{t("onboarding.ready_to_start")}</p>

                  <div className="bg-muted/50 rounded-lg p-4 text-left">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={xAccounts[0]!.xAvatarUrl || ""}
                          alt={xAccounts[0]!.xUsername}
                          referrerPolicy="no-referrer"
                        />
                        <AvatarFallback>{xAccounts[0]!.xUsername[0]!.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">
                          {xAccounts[0]!.xDisplayName || xAccounts[0]!.xUsername}
                        </p>
                        <p className="text-muted-foreground text-sm">@{xAccounts[0]!.xUsername}</p>
                      </div>
                      {xAccounts[0]!.isDefault && (
                        <span className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs font-medium">
                          {t("onboarding.default_label")}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-muted-foreground text-sm">
                    {t("onboarding.add_more_accounts_hint")}
                  </p>

                  <Button variant="outline" asChild>
                    <a href="/dashboard/settings">
                      <Twitter className="mr-2 h-4 w-4" />
                      {t("onboarding.add_another_account")}
                    </a>
                  </Button>
                </>
              ) : (
                <>
                  <div className="mb-2 inline-block rounded-full bg-amber-500/10 p-6">
                    <Twitter className="h-12 w-12 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-bold">{t("onboarding.no_x_account_connected")}</h3>
                  <p className="text-muted-foreground">
                    {t("onboarding.please_connect_x_account")}
                  </p>
                  <Button asChild>
                    <a href="/dashboard/settings">{t("onboarding.go_to_settings")}</a>
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Step 2 — Compose (with inline preferences strip) */}
          {currentStep === 2 && (
            <div className="w-full max-w-md space-y-3">
              {/* Inline preferences strip */}
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span>
                  {t("onboarding.preferences_detected", {
                    language: languageLabel,
                    timezone: timezoneLabel,
                  })}
                </span>
                <Popover
                  open={prefsPopoverOpen}
                  onOpenChange={(open) => {
                    setPrefsPopoverOpen(open);
                    if (!open) {
                      void handleSavePreferences();
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-primary h-auto p-0 text-xs underline-offset-2 hover:underline"
                    >
                      {t("onboarding.change_preferences")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <Languages className="text-primary h-4 w-4" />
                          {t("onboarding.preferred_language")}
                        </label>
                        <Select value={prefLanguage} onValueChange={setPrefLanguage}>
                          <SelectTrigger
                            className="w-full"
                            aria-label={t("onboarding.select_language")}
                          >
                            <SelectValue placeholder={t("onboarding.select_language")} />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGES.map((lang) => (
                              <SelectItem key={lang.code} value={lang.code}>
                                {lang.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <Globe className="text-primary h-4 w-4" />
                          {t("onboarding.time_zone_label")}
                        </label>
                        <Select value={prefTimezone} onValueChange={setPrefTimezone}>
                          <SelectTrigger
                            className="w-full"
                            aria-label={t("onboarding.select_timezone")}
                          >
                            <SelectValue placeholder={t("onboarding.select_timezone")} />
                          </SelectTrigger>
                          <SelectContent>
                            {TIMEZONE_GROUPS.map((group) => (
                              <SelectGroup key={group.label}>
                                <SelectLabel>{group.label}</SelectLabel>
                                {group.zones.map((zone) => (
                                  <SelectItem key={zone.value} value={zone.value}>
                                    {zone.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">
                  {t("onboarding.draft_your_first_tweet")}
                </label>
                {createdPostId !== null && (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
                    <CheckCircle2 className="me-1 h-3 w-3" />
                    {t("onboarding.draft_saved_badge")}
                  </Badge>
                )}
              </div>
              <Textarea
                value={tweetContent}
                onChange={(e) => setTweetContent(e.target.value)}
                className="min-h-[150px] resize-none"
                placeholder={t("onboarding.first_tweet_placeholder")}
                autoFocus
              />
              <p
                className={cn(
                  "text-right text-xs font-medium",
                  isOverHardLimit
                    ? "text-destructive"
                    : isOverStandardLimit
                      ? "text-amber-500"
                      : "text-muted-foreground"
                )}
              >
                {tweetWeightedLength} / 280
                {isOverStandardLimit && !isOverHardLimit && (
                  <span className="ml-1 opacity-70">{t("onboarding.over_standard_limit")}</span>
                )}
              </p>
            </div>
          )}

          {/* Step 3 — Schedule (Send Now primary, date/time collapsible) */}
          {currentStep === 3 && (
            <div className="w-full max-w-xs space-y-4 text-center">
              <p className="text-sm font-medium">{t("onboarding.when_to_publish")}</p>

              {/* Send Now — primary path */}
              <button
                type="button"
                onClick={handleSendNow}
                disabled={loading}
                className="border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 text-primary flex w-full items-center justify-center gap-2 rounded-lg border-2 p-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Rocket className="h-4 w-4" />
                {t("onboarding.send_now")}
              </button>

              {/* Collapsed date/time picker */}
              <details className="group rounded-md border text-left">
                <summary className="text-muted-foreground hover:text-foreground cursor-pointer list-none p-3 text-xs select-none">
                  <span className="flex items-center justify-between">
                    <span>{t("onboarding.or_schedule_later")}</span>
                    <span className="transition-transform group-open:rotate-180">v</span>
                  </span>
                </summary>
                <div className="space-y-3 border-t p-3">
                  <div className="space-y-2">
                    <label className="text-muted-foreground text-xs">
                      {t("onboarding.date_label")}
                    </label>
                    <DatePicker
                      value={scheduledDate}
                      onChange={setScheduledDate}
                      placeholder={t("onboarding.pick_date")}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-muted-foreground text-xs">
                      {t("onboarding.time_label")}
                    </label>
                    <Select value={scheduledTime} onValueChange={setScheduledTime}>
                      <SelectTrigger className="w-full" aria-label={t("onboarding.select_time")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((group) => (
                          <SelectGroup key={group.label}>
                            <SelectLabel>{group.label}</SelectLabel>
                            {group.options.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {t("onboarding.auto_publish_hint")}
                  </p>
                </div>
              </details>
            </div>
          )}

          {/* Step 4 — Done (auto-redirects after 2s) */}
          {currentStep === 4 && (
            <div className="w-full max-w-lg space-y-6 text-center">
              <div className="bg-primary/5 mb-2 inline-block rounded-full p-6">
                <Rocket className="text-primary h-12 w-12" />
              </div>
              <h3 className="text-xl font-bold">{t("onboarding.youre_all_set")}</h3>
              <p className="text-muted-foreground">{t("onboarding.all_set_body")}</p>
              {/* Feature cards — must use navigateAfterOnboarding (hard reload), not <Link>.
                  Client-side nav is faster than the DB write, causing the dashboard
                  layout to see onboardingCompleted=false and redirect back to the
                  onboarding shell (missing sidebar). */}
              <div className="mt-4 grid grid-cols-2 gap-3 text-left">
                {(
                  [
                    {
                      icon: PenTool,
                      title: t("onboarding.feature_cards.ai_writer"),
                      description: t("onboarding.feature_cards.ai_writer_desc"),
                      href: "/dashboard/ai",
                    },
                    {
                      icon: BarChart3,
                      title: t("onboarding.feature_cards.analytics"),
                      description: t("onboarding.feature_cards.analytics_desc"),
                      href: "/dashboard/analytics",
                    },
                    {
                      icon: Lightbulb,
                      title: t("onboarding.feature_cards.inspiration"),
                      description: t("onboarding.feature_cards.inspiration_desc"),
                      href: "/dashboard/inspiration",
                    },
                    {
                      icon: ListOrdered,
                      title: t("onboarding.feature_cards.queue"),
                      description: t("onboarding.feature_cards.queue_desc"),
                      href: "/dashboard/queue",
                    },
                  ] as const
                ).map((card) => (
                  <button
                    key={card.href}
                    type="button"
                    onClick={() => void navigateAfterOnboarding(card.href)}
                    className="hover:bg-muted/50 hover:border-primary/30 block w-full rounded-md border p-4 text-left transition-colors"
                    aria-label={card.title}
                  >
                    <h3 className="flex items-center gap-2 font-semibold">
                      <card.icon className="text-primary h-4 w-4" />
                      {card.title}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-xs">{card.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="bg-muted/10 flex justify-between border-t p-6">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1 || loading}
            className="min-h-[44px]"
          >
            {t("onboarding.back")}
          </Button>

          <Button onClick={handleNext} disabled={loading} size="lg" className="min-h-[44px]">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {currentStep === steps.length ? t("onboarding.finish") : t("onboarding.continue")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
