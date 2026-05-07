"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { XSubscriptionBadge } from "@/components/ui/x-subscription-badge";
import type { XSubscriptionTier } from "@/lib/schemas/common";
import { cn } from "@/lib/utils";

interface XAccountAvatarProps {
  username?: string | undefined;
  profileImageUrl?: string | null | undefined;
  subscriptionTier?: XSubscriptionTier | undefined;
  size?: "sm" | "default";
  showBadge?: boolean;
  className?: string;
}

export function XAccountAvatar({
  username,
  profileImageUrl,
  subscriptionTier,
  size = "default",
  showBadge = false,
  className,
}: XAccountAvatarProps) {
  const avatarSize = size === "sm" ? "h-5 w-5" : "h-8 w-8";
  const fallbackSize = size === "sm" ? "text-[10px]" : "text-[11px]";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Avatar className={cn("shrink-0", avatarSize)}>
        <AvatarImage src={profileImageUrl ?? undefined} />
        <AvatarFallback className={fallbackSize}>{username?.[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      {username && <span dir="auto">@{username}</span>}
      {showBadge && subscriptionTier && <XSubscriptionBadge tier={subscriptionTier} size="sm" />}
    </div>
  );
}
