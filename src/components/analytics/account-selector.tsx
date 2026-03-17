"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Account {
  id: string;
  xUsername: string | null;
}

interface AccountSelectorProps {
  accounts: Account[];
  selectedAccountId: string | undefined;
  isCompact: boolean;
  range: string;
}

/**
 * Renders a Select dropdown on mobile (< 640px) and clickable chip links on
 * desktop (≥ 640px) for switching the active X account in the Analytics page.
 *
 * Built as a client component because the Select requires `onValueChange` →
 * `router.push`; the chip links are plain Next.js Links that work without JS.
 */
export function AccountSelector({
  accounts,
  selectedAccountId,
  isCompact,
  range,
}: AccountSelectorProps) {
  const router = useRouter();

  const buildHref = (accountId: string) => {
    const params = new URLSearchParams({ accountId });
    if (isCompact) params.set("density", "compact");
    if (range) params.set("range", range);
    return `/dashboard/analytics?${params.toString()}`;
  };

  if (accounts.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Connect an X account to enable follower tracking.
      </div>
    );
  }

  return (
    <>
      {/* Mobile: Select dropdown — avoids horizontal scroll on narrow screens */}
      <div className="sm:hidden">
        <Select
          {...(selectedAccountId !== undefined && { value: selectedAccountId })}
          onValueChange={(id) => router.push(buildHref(id))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                @{a.xUsername}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: Chip links with active highlight */}
      <div className="hidden sm:flex flex-wrap items-center gap-2">
        {accounts.map((a) => {
          const active = a.id === selectedAccountId;
          return (
            <Link
              key={a.id}
              href={buildHref(a.id)}
              className={
                "rounded-md border px-3 py-1.5 text-sm transition-colors " +
                (active
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "text-muted-foreground hover:bg-muted")
              }
            >
              @{a.xUsername}
            </Link>
          );
        })}
      </div>
    </>
  );
}
