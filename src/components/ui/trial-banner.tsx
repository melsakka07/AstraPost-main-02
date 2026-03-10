"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { differenceInDays } from "date-fns";
import { AlertCircle } from "lucide-react";

interface TrialBannerProps {
  trialEndsAt: Date | null;
  plan: string;
}

export function TrialBanner({ trialEndsAt, plan }: TrialBannerProps) {
  const pathname = usePathname();

  // Don't show on marketing pages or login/register
  if (!pathname.startsWith("/dashboard")) return null;
  
  // Don't show if upgraded or no trial date
  if (plan !== "free" || !trialEndsAt) return null;

  const daysLeft = differenceInDays(new Date(trialEndsAt), new Date());
  
  // Trial expired
  if (daysLeft < 0) {
    return (
      <div className="bg-destructive text-destructive-foreground px-4 py-2 text-center text-sm font-medium">
        <div className="flex items-center justify-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>Your free trial has expired. Upgrade to continue using Pro features.</span>
          <Link href="/pricing" className="underline hover:text-white/90 ml-2">
            Upgrade Now
          </Link>
        </div>
      </div>
    );
  }

  // Show only if <= 3 days left
  if (daysLeft > 3) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium">
      <div className="flex items-center justify-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span>Your free trial ends in {daysLeft === 0 ? "today" : `${daysLeft} days`}.</span>
        <Link href="/pricing" className="underline hover:text-white/90 ml-2">
          Upgrade to Pro
        </Link>
      </div>
    </div>
  );
}
