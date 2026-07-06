"use client";

import { useState } from "react";
import { Filter, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type InboxType = "all" | "mention" | "reply" | "quote";

export interface InboxAccount {
  id: string;
  handle: string;
}

interface InboxFilterBarProps {
  selectedAccountId: string | null;
  onAccountChange: (accountId: string | null) => void;
  selectedType: InboxType;
  onTypeChange: (type: InboxType) => void;
  showArchived: boolean;
  onArchivedToggle: (show: boolean) => void;
  showRead: boolean;
  onReadToggle: (show: boolean) => void;
  accounts: InboxAccount[];
  totalItemCount?: number;
}

const TYPE_TABS: { value: InboxType; labelKey: string }[] = [
  { value: "all", labelKey: "tabs.all" },
  { value: "mention", labelKey: "tabs.mentions" },
  { value: "reply", labelKey: "tabs.replies" },
  { value: "quote", labelKey: "tabs.quotes" },
];

/**
 * Horizontal filter bar with account selector, type tabs, and read/archived toggles.
 * On mobile, toggles collapse into a filter Sheet for space efficiency.
 */
export function InboxFilterBar({
  selectedAccountId,
  onAccountChange,
  selectedType,
  onTypeChange,
  showArchived,
  onArchivedToggle,
  showRead,
  onReadToggle,
  accounts,
  totalItemCount,
}: InboxFilterBarProps) {
  const t = useTranslations("inbox");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const hasActiveFilters =
    selectedAccountId !== null || selectedType !== "all" || showArchived || showRead;

  const handleReset = () => {
    onAccountChange(null);
    onTypeChange("all");
    onArchivedToggle(false);
    onReadToggle(false);
    setMobileFilterOpen(false);
  };

  const filterContent = (
    <>
      {/* Account selector */}
      <Select
        value={selectedAccountId ?? "all"}
        onValueChange={(v) => onAccountChange(v === "all" ? null : v)}
      >
        <SelectTrigger className="h-9 w-auto max-w-[200px] min-w-[140px] text-xs">
          <SelectValue placeholder={t("filter.account")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filter.allAccounts")}</SelectItem>
          {accounts.map((acc) => (
            <SelectItem key={acc.id} value={acc.id}>
              @{acc.handle}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Read toggle */}
      <Button
        variant={showRead ? "default" : "outline"}
        size="sm"
        onClick={() => onReadToggle(!showRead)}
        className="h-9 text-xs"
        aria-pressed={showRead}
        aria-label={t("filter.showRead")}
      >
        {t("filter.showRead")}
      </Button>

      {/* Archived toggle */}
      <Button
        variant={showArchived ? "default" : "outline"}
        size="sm"
        onClick={() => onArchivedToggle(!showArchived)}
        className="h-9 text-xs"
        aria-pressed={showArchived}
        aria-label={t("filter.showArchived")}
      >
        {t("filter.showArchived")}
      </Button>

      {/* Reset filters */}
      {hasActiveFilters ? (
        <Button variant="ghost" size="sm" onClick={handleReset} className="h-9 text-xs">
          <RotateCcw className="me-1 h-3 w-3" />
          <span className="hidden sm:inline">Reset</span>
        </Button>
      ) : null}
    </>
  );

  return (
    <div className="space-y-3">
      {/* Type tabs — always visible */}
      <div className="scrollbar-none flex items-center gap-1 overflow-x-auto pb-1">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTypeChange(tab.value)}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              selectedType === tab.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {t(tab.labelKey)}
          </button>
        ))}
        {totalItemCount !== undefined ? (
          <span className="text-muted-foreground ms-auto shrink-0 text-xs">{totalItemCount}</span>
        ) : null}
      </div>

      {/* Desktop filters: always visible */}
      <div className="hidden flex-wrap items-center gap-2 md:flex">{filterContent}</div>

      {/* Mobile filters: Sheet trigger + inline type tabs */}
      <div className="flex items-center gap-2 md:hidden">
        <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1 text-xs">
              <Filter className="h-3.5 w-3.5" />
              <span>Filters</span>
              {hasActiveFilters ? (
                <span className="bg-primary text-primary-foreground ms-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none">
                  !
                </span>
              ) : null}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[60vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription className="sr-only">
                Filter inbox items by account, type, and read status
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-wrap items-center gap-2 pt-4">{filterContent}</div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
