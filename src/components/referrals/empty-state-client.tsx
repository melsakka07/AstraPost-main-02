"use client";

import { Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";

interface ReferralsEmptyStateProps {
  referralLink: string;
}

export function ReferralsEmptyState({ referralLink }: ReferralsEmptyStateProps) {
  const t = useTranslations("referrals");

  return (
    <EmptyState
      icon={<Share2 className="h-6 w-6" />}
      title={t("no_referrals_yet")}
      description={t("empty_description")}
      primaryAction={
        <CopyButton value={referralLink} variant="default" className="text-primary-foreground">
          {t("copy_referral_link")}
        </CopyButton>
      }
    />
  );
}
