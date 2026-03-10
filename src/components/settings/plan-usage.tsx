"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface UsageData {
  plan: string;
  limits: {
    postsPerMonth: number;
    maxXAccounts: number;
    aiGenerationsPerMonth: number;
  };
  usage: {
    posts: number;
    accounts: number;
    ai: number;
  };
}

export function PlanUsage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/billing/usage")
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="space-y-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
    </div>;
  }

  if (!data) return null;

  const { limits, usage } = data;

  const postPercentage = limits.postsPerMonth === Infinity 
    ? 0 // Or just show "Unlimited"
    : Math.min(100, (usage.posts / limits.postsPerMonth) * 100);

  const accountPercentage = Math.min(100, (usage.accounts / limits.maxXAccounts) * 100);

  return (
    <div className="space-y-6 mt-4 border-t pt-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Posts this month</span>
          <span className="text-muted-foreground">
            {usage.posts} / {limits.postsPerMonth === Infinity ? "Unlimited" : limits.postsPerMonth}
          </span>
        </div>
        <Progress value={postPercentage} className="h-2" />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Connected X Accounts</span>
          <span className="text-muted-foreground">
            {usage.accounts} / {limits.maxXAccounts}
          </span>
        </div>
        <Progress value={accountPercentage} className="h-2" />
      </div>
      
      {/* We can add AI usage if we track it */}
    </div>
  );
}
