"use client";

import { useState, useEffect, useRef } from "react";
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
import { toast } from "sonner";
import twitter from "twitter-text";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

const steps = [
  {
    id: 1,
    title: "Connect Your X Account",
    icon: Twitter,
    description: "Confirm your connected X account.",
  },
  {
    id: 2,
    title: "Preferences",
    icon: Globe,
    description: "Set your language and time zone.",
  },
  {
    id: 3,
    title: "Compose",
    icon: PenTool,
    description: "Write your first tweet or thread.",
  },
  {
    id: 4,
    title: "Schedule",
    icon: Calendar,
    description: "Pick a time to publish.",
  },
  {
    id: 5,
    title: "Explore AI",
    icon: Rocket,
    description: "Discover AI-powered features.",
  },
];

// Time options grouped by period
const TIME_OPTIONS = [
  {
    label: "Morning",
    options: [
      { value: "06:00", label: "6:00 AM" },
      { value: "07:00", label: "7:00 AM" },
      { value: "08:00", label: "8:00 AM" },
      { value: "09:00", label: "9:00 AM" },
      { value: "10:00", label: "10:00 AM" },
      { value: "11:00", label: "11:00 AM" },
    ],
  },
  {
    label: "Afternoon",
    options: [
      { value: "12:00", label: "12:00 PM" },
      { value: "13:00", label: "1:00 PM" },
      { value: "14:00", label: "2:00 PM" },
      { value: "15:00", label: "3:00 PM" },
      { value: "16:00", label: "4:00 PM" },
      { value: "17:00", label: "5:00 PM" },
    ],
  },
  {
    label: "Evening",
    options: [
      { value: "18:00", label: "6:00 PM" },
      { value: "19:00", label: "7:00 PM" },
      { value: "20:00", label: "8:00 PM" },
      { value: "21:00", label: "9:00 PM" },
    ],
  },
  {
    label: "Night",
    options: [
      { value: "22:00", label: "10:00 PM" },
      { value: "23:00", label: "11:00 PM" },
      { value: "00:00", label: "12:00 AM" },
    ],
  },
];

// Step 4 feature cards with real hrefs — O4 + O7
const FEATURE_CARDS = [
  {
    icon: PenTool,
    title: "AI Writer",
    description: "Generate threads instantly.",
    href: "/dashboard/ai",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Track your growth.",
    href: "/dashboard/analytics",
  },
  {
    icon: Lightbulb,
    title: "Inspiration",
    description: "Import tweets to adapt.",
    href: "/dashboard/inspiration",
  },
  {
    icon: ListOrdered,
    title: "Queue",
    description: "Manage scheduled posts.",
    href: "/dashboard/queue",
  },
];

const TIMEZONE_GROUPS = [
  {
    label: "Middle East & North Africa",
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
    label: "Europe",
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
    label: "Americas",
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
    label: "Asia Pacific",
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
    label: "Africa",
    zones: [
      { value: "Africa/Lagos", label: "Nigeria — Lagos (GMT+1)" },
      { value: "Africa/Nairobi", label: "Kenya — Nairobi (GMT+3)" },
      { value: "Africa/Johannesburg", label: "South Africa (GMT+2)" },
      { value: "Africa/Accra", label: "Ghana — Accra (GMT)" },
    ],
  },
];

export function OnboardingWizard() {
  const searchParams = useSearchParams();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Holds the in-flight onboarding-complete API promise so all step-4
  // navigation can await it before doing a hard reload.
  const onboardingCompleteRef = useRef<Promise<void> | null>(null);

  // Step 1 — Preferences
  const [prefLanguage, setPrefLanguage] = useState("ar");
  const [prefTimezone, setPrefTimezone] = useState("Asia/Riyadh");

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
  // Step 3 — date (YYYY-MM-DD) + time (HH:mm)
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);

  // O2 — Character counter thresholds matching tweet-card.tsx
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

    const stepParam = searchParams.get("step");
    if (stepParam) {
      const step = parseInt(stepParam);
      if (step >= 1 && step <= steps.length) setCurrentStep(step);
    }
  }, [searchParams]);

  // Fetch connected X accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch("/api/x/accounts");
        if (res.ok) {
          const data = await res.json();
          setXAccounts(data.accounts || []);
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
            toast.error("Could not save onboarding status. Please try again.");
          }
        })
        .catch(() => {
          toast.error("Could not save onboarding status. Please try again.");
        });
    }
  }, [currentStep]);

  // All step-4 navigation must go through here.
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

  const handleSkipSchedule = async () => {
    // O5 — skip step 4 (Schedule), stay as draft, go to step 5
    setCurrentStep(5);
  };

  const handleSkipOnboarding = async () => {
    // B-U03 — Skip entire wizard, allow resume later from settings
    setLoading(true);
    try {
      const res = await fetch("/api/user/onboarding/skip", { method: "POST" });
      if (!res.ok) {
        toast.error("Failed to skip onboarding");
        setLoading(false);
        return;
      }
      // Navigate to dashboard — user can resume from settings
      window.location.href = "/dashboard";
    } catch (error) {
      clientLogger.error("Failed to skip onboarding", {
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error("Failed to skip onboarding");
      setLoading(false);
    }
  };

  const handleSendNow = async () => {
    setLoading(true);
    try {
      if (createdPostId) {
        const res = await fetch(`/api/posts/${createdPostId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "publish_now" }),
        });
        if (!res.ok) throw new Error("Failed to publish");
        toast.success("Post queued for immediate publishing!");
      }
      setCurrentStep(5);
    } catch {
      toast.error("Failed to send post");
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
        // Step 2 — save language + timezone
        const res = await fetch("/api/user/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timezone: prefTimezone, language: prefLanguage }),
        });
        if (!res.ok) {
          toast.error("Failed to save preferences");
          setLoading(false);
          return;
        }
        setCurrentStep(3);
      } else if (currentStep === 3) {
        // Step 3 — Compose
        if (!tweetContent.trim()) {
          toast.error("Please write something");
          setLoading(false);
          return;
        }
        if (isOverHardLimit) {
          toast.error(`Tweet is too long (${tweetWeightedLength}/1000 characters)`);
          setLoading(false);
          return;
        }

        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tweets: [{ content: tweetContent }],
            action: "draft",
          }),
        });

        if (!res.ok) throw new Error("Failed to create draft");

        const data = await res.json();
        setCreatedPostId(data.postIds[0]);
        setCurrentStep(4);
      } else if (currentStep === 4) {
        // Step 4 — Schedule
        const iso = getScheduledISO();
        if (!iso) {
          toast.error("Please select a date");
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
        }
        setCurrentStep(5);
      } else if (currentStep === 5) {
        // Step 5 — Explore AI → go to dashboard with tour enabled
        await navigateAfterOnboarding("/dashboard?tour=true");
      }
    } catch (error) {
      clientLogger.error("Onboarding step failed", {
        step: currentStep,
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-center text-3xl font-bold">Welcome to AstraPost! 🚀</h1>
        <p className="text-muted-foreground text-center">
          Let&apos;s get you set up in just a few steps.
        </p>
      </div>

      {/* Mobile compact stepper */}
      <div className="text-muted-foreground mb-6 flex items-center gap-2 text-sm md:hidden">
        <span className="text-foreground font-medium">
          Step {currentStep} of {steps.length}
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
      <Card className="flex min-h-[300px] flex-col border-2 shadow-lg md:min-h-[400px]">
        <CardHeader className="bg-muted/20 border-b text-center">
          <CardTitle className="text-2xl">{steps[currentStep - 1]!.title}</CardTitle>
          <CardDescription>{steps[currentStep - 1]!.description}</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col items-center justify-center space-y-6 p-4 md:p-8">
          {/* Step 1 — X Account Confirmation */}
          {currentStep === 1 && (
            <div className="w-full max-w-md space-y-6 text-center">
              {loadingAccounts ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="text-primary h-8 w-8 animate-spin" />
                  <p className="text-muted-foreground">Loading your account...</p>
                </div>
              ) : xAccounts.length > 0 ? (
                <>
                  <div className="bg-primary/5 mb-2 inline-block rounded-full p-6">
                    <Twitter className="text-primary h-12 w-12" />
                  </div>
                  <h3 className="text-xl font-bold">Your X Account is Connected!</h3>
                  <p className="text-muted-foreground">
                    You&apos;re ready to start scheduling posts with AstraPost.
                  </p>

                  {/* Connected account card */}
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
                          Default
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-muted-foreground text-sm">
                    You can add more accounts later from Settings. Pro & Agency plans let you manage
                    multiple X accounts under one subscription.
                  </p>

                  <Button variant="outline" asChild>
                    <a href="/dashboard/settings">
                      <Twitter className="mr-2 h-4 w-4" />
                      Add another account
                    </a>
                  </Button>
                </>
              ) : (
                <>
                  <div className="mb-2 inline-block rounded-full bg-amber-500/10 p-6">
                    <Twitter className="h-12 w-12 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-bold">No X Account Connected</h3>
                  <p className="text-muted-foreground">
                    Please connect your X account to continue with AstraPost.
                  </p>
                  <Button asChild>
                    <a href="/dashboard/settings">Go to Settings</a>
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Step 2 — Preferences (language + timezone) */}
          {currentStep === 2 && (
            <div className="w-full max-w-sm space-y-5">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Languages className="text-primary h-4 w-4" />
                  Preferred Language
                </label>
                <Select value={prefLanguage} onValueChange={setPrefLanguage}>
                  <SelectTrigger className="w-full" aria-label="Select language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  Used for AI-generated content and writing tools.
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Globe className="text-primary h-4 w-4" />
                  Time Zone
                </label>
                <Select value={prefTimezone} onValueChange={setPrefTimezone}>
                  <SelectTrigger className="w-full" aria-label="Select timezone">
                    <SelectValue placeholder="Select timezone" />
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
                <p className="text-muted-foreground text-xs">
                  Ensures your scheduled posts go out at the right local time.
                </p>
              </div>
            </div>
          )}

          {/* Step 3 — Compose — O2, O3, O6 */}
          {currentStep === 3 && (
            <div className="w-full max-w-md space-y-3">
              <label className="text-sm font-medium">Draft your first tweet</label>
              {/* O3 — shadcn Textarea */}
              <Textarea
                value={tweetContent}
                onChange={(e) => setTweetContent(e.target.value)}
                className="min-h-[150px] resize-none"
                placeholder="Hello World! This is my first tweet via AstraPost. 🚀"
                autoFocus
              />
              {/* O2 — char counter with amber/destructive thresholds */}
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
                  <span className="ml-1 opacity-70">(over X standard limit)</span>
                )}
              </p>
            </div>
          )}

          {/* Step 4 — Schedule — O1 */}
          {currentStep === 4 && (
            <div className="w-full max-w-xs space-y-4 text-center">
              <p className="text-sm font-medium">When should this go out?</p>

              {/* Send Now option */}
              <button
                type="button"
                onClick={handleSendNow}
                disabled={loading}
                className="border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 text-primary flex w-full items-center justify-center gap-2 rounded-lg border-2 p-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Rocket className="h-4 w-4" />
                Send Now
              </button>

              <div className="text-muted-foreground relative flex items-center gap-2 text-xs">
                <div className="flex-1 border-t" />
                <span>or schedule for later</span>
                <div className="flex-1 border-t" />
              </div>

              {/* O1 — DatePicker + time Select */}
              <div className="space-y-2 text-left">
                <label className="text-muted-foreground text-xs">Date</label>
                <DatePicker
                  value={scheduledDate}
                  onChange={setScheduledDate}
                  placeholder="Pick a date"
                />
              </div>
              <div className="space-y-2 text-left">
                <label className="text-muted-foreground text-xs">Time</label>
                <Select value={scheduledTime} onValueChange={setScheduledTime}>
                  <SelectTrigger className="w-full" aria-label="Select time">
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
              <p className="text-muted-foreground text-sm">
                We&apos;ll automatically publish it at this time.
              </p>
            </div>
          )}

          {/* Step 5 — Explore AI — O4, O7 */}
          {currentStep === 5 && (
            <div className="w-full max-w-lg space-y-6 text-center">
              <div className="bg-primary/5 mb-2 inline-block rounded-full p-6">
                <Rocket className="text-primary h-12 w-12" />
              </div>
              <h3 className="text-xl font-bold">You&apos;re all set!</h3>
              <p className="text-muted-foreground">
                Your first post is scheduled. Head over to the dashboard to track its performance or
                create more content with our AI tools.
              </p>
              {/* O4 + O7 — 4 real linked feature cards.
                  Must use navigateAfterOnboarding (hard reload) — not <Link>.
                  Client-side nav is faster than the DB write, causing the
                  dashboard layout to see onboardingCompleted=false and
                  redirect back to the onboarding shell (missing sidebar). */}
              <div className="mt-4 grid grid-cols-2 gap-3 text-left">
                {FEATURE_CARDS.map((card) => (
                  <button
                    key={card.href}
                    type="button"
                    onClick={() => void navigateAfterOnboarding(card.href)}
                    className="hover:bg-muted/50 hover:border-primary/30 block w-full rounded-md border p-4 text-left transition-colors"
                    aria-label={`Go to ${card.title}`}
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
            Back
          </Button>

          <div className="flex items-center gap-2">
            {/* B-U03 — Skip entire wizard on any step (except last) */}
            {currentStep < steps.length && (
              <Button
                variant="ghost"
                onClick={handleSkipOnboarding}
                disabled={loading}
                className="text-muted-foreground min-h-[44px]"
              >
                Skip for now
              </Button>
            )}
            {/* O5 — Skip scheduling on step 4 */}
            {currentStep === 4 && (
              <Button
                variant="ghost"
                onClick={handleSkipSchedule}
                disabled={loading}
                className="text-muted-foreground min-h-[44px]"
              >
                Skip — save as draft
              </Button>
            )}
            <Button onClick={handleNext} disabled={loading} size="lg" className="min-h-[44px]">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentStep === steps.length ? "Go to Dashboard" : "Next Step"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
