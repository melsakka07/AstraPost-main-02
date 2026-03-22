"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Lightbulb,
  ListOrdered,
  Loader2,
  PenTool,
  Rocket,
  Twitter,
} from "lucide-react";
import { toast } from "sonner";
import twitter from "twitter-text";
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
import { signIn } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const steps = [
  {
    id: 1,
    title: "Connect X",
    icon: Twitter,
    description: "Connect your X (Twitter) account to get started.",
  },
  {
    id: 2,
    title: "Compose",
    icon: PenTool,
    description: "Write your first tweet or thread.",
  },
  {
    id: 3,
    title: "Schedule",
    icon: Calendar,
    description: "Pick a time to publish.",
  },
  {
    id: 4,
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

export function OnboardingWizard() {
  const searchParams = useSearchParams();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [checkingAccounts, setCheckingAccounts] = useState(true);

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
    const stepParam = searchParams.get("step");
    if (stepParam) {
      const step = parseInt(stepParam);
      if (step >= 1 && step <= 4) setCurrentStep(step);
    }
    checkAccounts();
  }, [searchParams]);

  const checkAccounts = async () => {
    try {
      const res = await fetch("/api/x/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingAccounts(false);
    }
  };

  /** Combine date + time into an ISO string */
  const getScheduledISO = (): string | null => {
    if (!scheduledDate) return null;
    const [year, month, day] = scheduledDate.split("-").map(Number);
    const [hour, minute] = scheduledTime.split(":").map(Number);
    const d = new Date(year!, month! - 1, day!, hour!, minute!, 0);
    return d.toISOString();
  };

  const handleSkipSchedule = async () => {
    // O5 — skip step 3, stay as draft, go to step 4
    setCurrentStep(4);
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      if (currentStep === 1) {
        if (accounts.length === 0) {
          toast.error("Please connect an X account first");
          setLoading(false);
          return;
        }
        setCurrentStep(2);
      } else if (currentStep === 2) {
        if (!tweetContent.trim()) {
          toast.error("Please write something");
          setLoading(false);
          return;
        }
        if (isOverHardLimit) {
          toast.error(
            `Tweet is too long (${tweetWeightedLength}/1000 characters)`
          );
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
        setCurrentStep(3);
      } else if (currentStep === 3) {
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
        setCurrentStep(4);
      } else if (currentStep === 4) {
        await fetch("/api/user/onboarding-complete", { method: "POST" });
        window.location.href = "/dashboard";
      }
    } catch (error) {
      console.error("Step error:", error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectX = async () => {
    setLoading(true);
    try {
      await signIn.social({
        provider: "twitter",
        callbackURL: "/dashboard/onboarding?step=2",
      });
    } catch {
      toast.error("Failed to connect X account");
      setLoading(false);
    }
  };

  if (checkingAccounts) {
    return (
      <div
        role="status"
        aria-label="Loading onboarding"
        className="flex justify-center py-20"
      >
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 md:py-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center mb-2">
          Welcome to AstraPost! 🚀
        </h1>
        <p className="text-muted-foreground text-center">
          Let&apos;s get you set up in just a few steps.
        </p>
      </div>

      {/* Mobile compact stepper */}
      <div className="flex md:hidden items-center gap-2 mb-6 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          Step {currentStep} of {steps.length}
        </span>
        <span aria-hidden="true">·</span>
        <span>{steps[currentStep - 1]!.title}</span>
      </div>

      {/* Desktop progress stepper */}
      <div className="hidden md:flex justify-between items-center mb-12 relative">
        <div className="absolute left-0 top-1/2 w-full h-1 bg-muted -z-10" />
        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          return (
            <div
              key={step.id}
              className="flex flex-col items-center bg-background px-2"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                  isCompleted
                    ? "bg-primary border-primary text-primary-foreground"
                    : isCurrent
                      ? "border-primary text-primary"
                      : "border-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <step.icon className="w-5 h-5" />
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
      <Card className="min-h-[300px] md:min-h-[400px] flex flex-col shadow-lg border-2">
        <CardHeader className="text-center border-b bg-muted/20">
          <CardTitle className="text-2xl">
            {steps[currentStep - 1]!.title}
          </CardTitle>
          <CardDescription>
            {steps[currentStep - 1]!.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 space-y-6">
          {/* Step 1 — Connect X */}
          {currentStep === 1 && (
            <div className="text-center space-y-6 max-w-sm">
              {accounts.length > 0 ? (
                <div className="bg-success/10 border border-success/30 text-success p-4 rounded-lg flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-8 w-8" />
                  <div className="font-semibold">
                    Connected as @{accounts[0].xUsername}
                  </div>
                  <p className="text-sm">You are ready to proceed!</p>
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    Connect your X account to enable scheduling and analytics.
                    We need &apos;write&apos; permissions to post for you.
                  </p>
                  <Button
                    onClick={handleConnectX}
                    size="lg"
                    disabled={loading}
                    className="bg-black hover:bg-black/90 text-white w-full min-h-[44px]"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Twitter className="mr-2 h-5 w-5 fill-white" />
                    )}
                    {loading ? "Connecting..." : "Connect X Account"}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Step 2 — Compose — O2, O3, O6 */}
          {currentStep === 2 && (
            <div className="w-full max-w-md space-y-3">
              <label className="text-sm font-medium">
                Draft your first tweet
              </label>
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
                  "text-xs text-right font-medium",
                  isOverHardLimit
                    ? "text-destructive"
                    : isOverStandardLimit
                      ? "text-amber-500"
                      : "text-muted-foreground"
                )}
              >
                {tweetWeightedLength} / 280
                {isOverStandardLimit && !isOverHardLimit && (
                  <span className="ml-1 opacity-70">
                    (over X standard limit)
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Step 3 — Schedule — O1 */}
          {currentStep === 3 && (
            <div className="w-full max-w-xs space-y-4 text-center">
              <p className="text-sm font-medium">
                When should this go out?
              </p>
              {/* O1 — DatePicker + time Select */}
              <div className="space-y-2 text-left">
                <label className="text-xs text-muted-foreground">Date</label>
                <DatePicker
                  value={scheduledDate}
                  onChange={setScheduledDate}
                  placeholder="Pick a date"
                />
              </div>
              <div className="space-y-2 text-left">
                <label className="text-xs text-muted-foreground">Time</label>
                <Select
                  value={scheduledTime}
                  onValueChange={setScheduledTime}
                >
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
              <p className="text-sm text-muted-foreground">
                We&apos;ll automatically publish it at this time.
              </p>
            </div>
          )}

          {/* Step 4 — Explore AI — O4, O7 */}
          {currentStep === 4 && (
            <div className="text-center space-y-6 max-w-lg w-full">
              <div className="bg-primary/5 p-6 rounded-full inline-block mb-2">
                <Rocket className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-bold">You&apos;re all set!</h3>
              <p className="text-muted-foreground">
                Your first post is scheduled. Head over to the dashboard to
                track its performance or create more content with our AI tools.
              </p>
              {/* O4 + O7 — 4 real linked feature cards */}
              <div className="grid grid-cols-2 gap-3 text-left mt-4">
                {FEATURE_CARDS.map((card) => (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="p-4 border rounded-md hover:bg-muted/50 hover:border-primary/30 transition-colors block"
                    aria-label={`Go to ${card.title}`}
                  >
                    <h3 className="font-semibold flex items-center gap-2">
                      <card.icon className="h-4 w-4 text-primary" />
                      {card.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {card.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t p-6 bg-muted/10">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1 || loading}
            className="min-h-[44px]"
          >
            Back
          </Button>

          <div className="flex items-center gap-2">
            {/* O5 — Skip scheduling on step 3 */}
            {currentStep === 3 && (
              <Button
                variant="ghost"
                onClick={handleSkipSchedule}
                disabled={loading}
                className="min-h-[44px] text-muted-foreground"
              >
                Skip — save as draft
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={loading}
              size="lg"
              className="min-h-[44px]"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentStep === steps.length ? "Go to Dashboard" : "Next Step"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
