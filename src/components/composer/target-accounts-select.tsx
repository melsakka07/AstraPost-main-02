
"use client";

import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type XAccountLite = {
  id: string;
  xUsername: string;
  xDisplayName?: string | null;
  xAvatarUrl?: string | null;
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
  accounts: XAccountLite[];
  loading?: boolean;
}) {
  const selectedLabels = useMemo(() => {
    const selected = accounts.filter((a) => value.includes(a.id));
    if (selected.length === 0) return "Select accounts";
    if (selected.length === 1) return `@${selected[0]!.xUsername}`;
    return `${selected.length} accounts`;
  }, [accounts, value]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between" disabled={loading}>
          <span className="truncate">{loading ? "Loading accounts..." : selectedLabels}</span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel>Post to</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {accounts.length === 0 ? (
          <div className="px-2 py-2 text-sm text-muted-foreground">No X accounts connected</div>
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
              @{a.xUsername}
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
