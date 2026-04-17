"use client";

import { Share2 } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";

interface ReferralsEmptyStateProps {
  referralLink: string;
}

export function ReferralsEmptyState({ referralLink }: ReferralsEmptyStateProps) {
  return (
    <EmptyState
      icon={<Share2 className="h-6 w-6" />}
      title="No referrals yet"
      description="Share your unique referral link with friends to start earning credits. Every friend who subscribes gets you $5 in account credit."
      primaryAction={
        <CopyButton value={referralLink} variant="default" className="text-primary-foreground">
          Copy Referral Link
        </CopyButton>
      }
    />
  );
}
