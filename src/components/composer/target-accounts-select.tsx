"use client";

import { useMemo } from "react";
import { ChevronDown, Linkedin, Twitter, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SocialAccountLite = {
  id: string;
  platform: 'twitter' | 'linkedin' | 'instagram';
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  isDefault?: boolean | null;
};

export function TargetAccountsSelect({
  value,
  onChange,
  accounts,
  loading
}: {
  value: string[];
  onChange: (next: string[]) => void;
  accounts: SocialAccountLite[];
  loading?: boolean;
}) {
  const selectedLabels = useMemo(() => {
    const selected = accounts.filter((a) => value.includes(a.id));
    if (selected.length === 0) return "Select accounts";
    if (selected.length === 1 && selected[0]) {
        return (
            <span className="flex items-center gap-2 truncate">
                {selected[0].platform === 'twitter' ? <Twitter className="h-3 w-3" /> : 
                 selected[0].platform === 'linkedin' ? <Linkedin className="h-3 w-3" /> :
                 <Instagram className="h-3 w-3" />}
                {selected[0].username}
            </span>
        );
    }
    return `${selected.length} accounts`;
  }, [accounts, value]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between" disabled={loading}>
          <span className="truncate flex items-center gap-2">{loading ? "Loading accounts..." : selectedLabels}</span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel>Post to</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {accounts.length === 0 ? (
          <div className="px-2 py-2 text-sm text-muted-foreground">No accounts connected</div>
        ) : (
          accounts.map((a) => (
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
                {a.platform === 'twitter' ? <Twitter className="h-3 w-3 text-sky-500" /> : 
                 a.platform === 'linkedin' ? <Linkedin className="h-3 w-3 text-[#0077b5]" /> :
                 <Instagram className="h-3 w-3 text-pink-600" />}
                <span className="truncate">{a.displayName || a.username}</span>
              </div>
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
