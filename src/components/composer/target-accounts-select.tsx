"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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

type XAccountLite = {
  id: string;
  xUsername: string;
  xDisplayName?: string | null;
  xAvatarUrl?: string | null;
  isDefault?: boolean | null;
};

export function TargetAccountsSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [accounts, setAccounts] = useState<XAccountLite[]>([]);
  const [loading, setLoading] = useState(true);

  // Keep a ref to the latest props so we can access them in the effect
  // without adding them to the dependency array (which would cause re-fetching)
  const propsRef = useRef({ value, onChange });
  propsRef.current = { value, onChange };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/x/accounts", { method: "GET" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const list = (data.accounts || []) as XAccountLite[];
        setAccounts(list);
        
        // Use the current value from the ref to avoid stale closure issues
        // and to avoid adding value/onChange to the dependency array
        const { value: currentValue, onChange: currentOnChange } = propsRef.current;
        
        if (currentValue.length === 0) {
          const defaults = list.filter((a) => a.isDefault).map((a) => a.id);
          currentOnChange(defaults.length > 0 ? defaults : list.slice(0, 1).map((a) => a.id));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
