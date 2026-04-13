"use client";

import { useMemo } from "react";
import {
  ChevronDown,
  Linkedin,
  Twitter,
  Instagram,
  AlertTriangle,
  CheckSquare2,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { XSubscriptionBadge, XSubscriptionTier } from "@/components/ui/x-subscription-badge";

function isTokenExpiringSoon(expiresAt: string | Date | null | undefined): boolean {
  if (!expiresAt) return false;
  const expiryDate = new Date(expiresAt);
  const hoursUntilExpiry = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60);
  return hoursUntilExpiry > 0 && hoursUntilExpiry <= 48;
}

export type SocialAccountLite = {
  id: string;
  platform: "twitter" | "linkedin" | "instagram";
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  isDefault?: boolean | null;
  xSubscriptionTier?: XSubscriptionTier;
  tokenExpiresAt?: string | Date | null;
};

export function TargetAccountsSelect({
  value,
  onChange,
  accounts,
  loading,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  accounts: SocialAccountLite[];
  loading?: boolean;
}) {
  const allSelected = accounts.length > 0 && value.length === accounts.length;

  const selectedLabels = useMemo(() => {
    const selected = accounts.filter((a) => value.includes(a.id));
    if (selected.length === 0) return "Select accounts";
    if (selected.length === 1 && selected[0]) {
      return (
        <span className="flex items-center gap-2 truncate">
          {selected[0].platform === "twitter" ? (
            <Twitter className="h-3 w-3" />
          ) : selected[0].platform === "linkedin" ? (
            <Linkedin className="h-3 w-3" />
          ) : (
            <Instagram className="h-3 w-3" />
          )}
          <span className="truncate">{selected[0].username}</span>
          {selected[0].platform === "twitter" && selected[0].xSubscriptionTier && (
            <XSubscriptionBadge tier={selected[0].xSubscriptionTier} size="sm" />
          )}
        </span>
      );
    }
    return `${selected.length} accounts`;
  }, [accounts, value]);

  return (
    <TooltipProvider>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between" disabled={loading}>
            <span className="flex items-center gap-2 truncate">
              {loading ? "Loading accounts..." : selectedLabels}
            </span>
            <ChevronDown className="h-4 w-4 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="start">
          <DropdownMenuLabel>Post to</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {accounts.length === 0 ? (
            <div className="px-2 py-2">
              <a
                href="/dashboard/settings"
                className="text-primary hover:text-primary/80 text-sm underline underline-offset-2"
              >
                Connect an X account to start posting →
              </a>
            </div>
          ) : (
            <>
              {accounts.length > 1 && (
                <>
                  <DropdownMenuCheckboxItem
                    checked={allSelected}
                    onCheckedChange={(checked) => {
                      onChange(checked ? accounts.map((a) => a.id) : []);
                    }}
                    className="font-medium"
                  >
                    <div className="flex items-center gap-2">
                      {allSelected ? (
                        <CheckSquare2 className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                      <span>Select all</span>
                    </div>
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {accounts.map((a) => (
                <DropdownMenuCheckboxItem
                  key={a.id}
                  checked={value.includes(a.id)}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? Array.from(new Set([...value, a.id]))
                      : value.filter((id) => id !== a.id);
                    onChange(next);
                  }}
                >
                  <div className="flex items-center gap-2">
                    {a.platform === "twitter" ? (
                      <Twitter className="h-3 w-3 text-sky-500" />
                    ) : a.platform === "linkedin" ? (
                      <Linkedin className="h-3 w-3 text-[#0077b5]" />
                    ) : (
                      <Instagram className="h-3 w-3 text-pink-600" />
                    )}
                    <span className="truncate">{a.displayName || a.username}</span>
                    {a.platform === "twitter" && a.xSubscriptionTier && (
                      <XSubscriptionBadge tier={a.xSubscriptionTier} size="sm" />
                    )}
                    {isTokenExpiringSoon(a.tokenExpiresAt) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                        </TooltipTrigger>
                        <TooltipContent>Token expires soon</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
