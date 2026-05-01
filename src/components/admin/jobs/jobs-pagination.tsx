"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface JobsPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  preserveTab: string;
}

export function JobsPagination({
  page,
  totalPages,
  total,
  pageSize,
  preserveTab,
}: JobsPaginationProps) {
  const t = useTranslations("admin");

  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-4 pt-1">
      <p className="text-muted-foreground shrink-0 text-sm" aria-live="polite">
        {t("common.showing_x_to_y_of_z", { from, to, total })}
      </p>

      {/* Desktop: page numbers */}
      <nav className="hidden items-center gap-1 md:flex" aria-label="Pagination">
        <PaginationLink
          page={page - 1}
          disabled={page <= 1}
          tab={preserveTab}
          ariaLabel={t("common.previous")}
        >
          <ChevronLeft className="h-4 w-4 rtl:scale-x-[-1]" />
          <span className="sr-only">{t("common.previous")}</span>
        </PaginationLink>

        {getPageNumbers(page, totalPages).map((p, i) =>
          p === "ellipsis" ? (
            <span
              key={`ellipsis-${i}`}
              className="text-muted-foreground inline-flex h-9 w-9 items-center justify-center text-sm"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <PaginationLink
              key={p}
              page={p as number}
              active={p === page}
              tab={preserveTab}
              ariaLabel={`Page ${p}`}
            >
              {p}
            </PaginationLink>
          )
        )}

        <PaginationLink
          page={page + 1}
          disabled={page >= totalPages}
          tab={preserveTab}
          ariaLabel={t("common.next")}
        >
          <span className="sr-only">{t("common.next")}</span>
          <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" />
        </PaginationLink>
      </nav>

      {/* Mobile: simplified */}
      <nav className="flex items-center gap-1 md:hidden" aria-label="Pagination">
        <PaginationLink
          page={page - 1}
          disabled={page <= 1}
          variant="ghost"
          size="sm"
          tab={preserveTab}
        >
          <ChevronLeft className="me-1 h-4 w-4 rtl:scale-x-[-1]" />
          {t("common.previous")}
        </PaginationLink>
        <span className="text-muted-foreground px-2 text-xs tabular-nums">
          {t("common.page_x_of_y", { page, total: totalPages })}
        </span>
        <PaginationLink
          page={page + 1}
          disabled={page >= totalPages}
          variant="ghost"
          size="sm"
          tab={preserveTab}
        >
          {t("common.next")}
          <ChevronRight className="ms-1 h-4 w-4 rtl:scale-x-[-1]" />
        </PaginationLink>
      </nav>
    </div>
  );
}

function PaginationLink({
  page: targetPage,
  disabled,
  active,
  children,
  variant = "outline",
  size = "icon",
  ariaLabel,
  tab,
}: {
  page: number;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
  variant?: "ghost" | "outline";
  size?: "sm" | "icon";
  ariaLabel?: string;
  tab: string;
}) {
  if (disabled) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled
        className={cn(size === "icon" && "h-9 w-9")}
        aria-label={ariaLabel}
      >
        {children}
      </Button>
    );
  }

  return (
    <Button
      variant={active ? "default" : variant}
      size={size}
      asChild
      className={cn(size === "icon" && "h-9 w-9")}
    >
      <Link
        href={`?page=${targetPage}&tab=${tab}`}
        aria-label={ariaLabel}
        aria-current={active ? "page" : undefined}
      >
        {children}
      </Link>
    </Button>
  );
}

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [];
  pages.push(1);

  if (current > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("ellipsis");
  }

  pages.push(total);
  return pages;
}
