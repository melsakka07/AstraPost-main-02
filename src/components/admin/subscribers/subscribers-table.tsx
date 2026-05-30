"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserPen,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { EmptyState } from "@/components/admin/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useAdminPolling } from "../use-admin-polling";
import { AddSubscriberDialog } from "./add-subscriber-dialog";
import { BanDialog } from "./ban-dialog";
import { BulkActionToolbar } from "./bulk-action-toolbar";
import { BulkBanDialog } from "./bulk-ban-dialog";
import { BulkChangePlanDialog } from "./bulk-change-plan-dialog";
import { BulkDeleteDialog } from "./bulk-delete-dialog";
import { DeleteDialog } from "./delete-dialog";
import { EditSubscriberDialog } from "./edit-subscriber-dialog";
import { PlanBadge, StatusBadge } from "./subscriber-badges";
import type { PaginatedResponse, SubscriberRow } from "./types";

type FilterOption =
  | "all"
  | "free"
  | "trial"
  | "pro_monthly"
  | "pro_annual"
  | "agency"
  | "banned"
  | "deleted";
type SortOption = "createdAt" | "lastLogin" | "plan";

interface SubscribersTableProps {
  initialData?: PaginatedResponse<SubscriberRow> | null;
}

export function SubscribersTable({ initialData }: SubscribersTableProps = {}) {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterOption>("all");
  const [sort, setSort] = useState<SortOption>("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const filterPills = useMemo(
    () => [
      { value: "all" as const, label: t("admin.subscribers.filters.all") },
      { value: "free" as const, label: t("admin.plans.free") },
      { value: "trial" as const, label: t("admin.subscribers.filters.trial") },
      { value: "pro_monthly" as const, label: t("admin.plans.proMonthly") },
      { value: "pro_annual" as const, label: t("admin.plans.proAnnual") },
      { value: "agency" as const, label: t("admin.plans.agency") },
      { value: "banned" as const, label: t("admin.subscribers.filters.banned") },
      { value: "deleted" as const, label: t("admin.subscribers.filters.deleted") },
    ],
    [t]
  );

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SubscriberRow | null>(null);
  const [banTarget, setBanTarget] = useState<SubscriberRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubscriberRow | null>(null);
  const [bulkBanOpen, setBulkBanOpen] = useState(false);
  const [bulkBanMode, setBulkBanMode] = useState<"ban" | "unban">("ban");
  const [bulkChangePlanOpen, setBulkChangePlanOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const {
    data: response,
    loading,
    refresh,
  } = useAdminPolling<PaginatedResponse<SubscriberRow>>({
    fetchFn: async (signal: AbortSignal) => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        filter,
        sort,
        order,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      const res = await fetch(`/api/admin/subscribers?${params}`, { signal });
      if (!res.ok) throw new Error("Failed to fetch subscribers");
      return (await res.json()) as PaginatedResponse<SubscriberRow>;
    },
    intervalMs: 60_000,
    ...(initialData !== undefined && { initialData }),
  });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 350);
  };

  const handleSelectAll = (checked: boolean | string) => {
    if (checked === true) {
      setSelectedIds(new Set(response?.data?.map((d: SubscriberRow) => d.id) ?? []));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkBan = () => {
    setBulkBanMode("ban");
    setBulkBanOpen(true);
  };

  const handleBulkUnban = () => {
    setBulkBanMode("unban");
    setBulkBanOpen(true);
  };

  const handleBulkSuccess = () => {
    refresh();
    handleClearSelection();
  };

  const handleExport = async () => {
    setBulkLoading(true);
    try {
      const response = await fetch("/api/admin/subscribers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "export",
          userIds: Array.from(selectedIds),
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        const { errors } = await response.json().catch(() => ({ errors: ["Export failed"] }));
        throw new Error(errors?.[0] || "Export failed");
      }

      const { data: csv } = await response.json();
      if (!csv) {
        throw new Error("No CSV data returned");
      }

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `subscribers-export-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success(t("admin.subscribers.bulk.exportedToast", { count: selectedIds.size }));
      handleClearSelection();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("admin.subscribers.bulk.exportError"));
    } finally {
      setBulkLoading(false);
    }
  };

  // Reset to page 1 when filter/sort changes
  useEffect(() => {
    setPage(1);
  }, [filter, sort, order]);

  const toggleSort = (col: SortOption) => {
    if (sort === col) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSort(col);
      setOrder("desc");
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="text-muted-foreground inset-inline-start-2.5 absolute top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t("admin.subscribers.searchPlaceholder")}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="ps-9"
            aria-label={t("admin.subscribers.searchAria")}
          />
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus className="me-2 h-4 w-4" />
          {t("admin.subscribers.addButton")}
        </Button>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {filterPills.map((pill) => (
          <button
            key={pill.value}
            onClick={() => setFilter(pill.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === pill.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Bulk action toolbar */}
      <BulkActionToolbar
        selectedCount={selectedIds.size}
        loading={bulkLoading}
        onClearSelection={handleClearSelection}
        onBan={handleBulkBan}
        onUnban={handleBulkUnban}
        onChangePlan={() => setBulkChangePlanOpen(true)}
        onDelete={() => setBulkDeleteOpen(true)}
        onExport={handleExport}
        hasBannedUsers={Array.from(selectedIds).some((id) => {
          const sub = response?.data?.find((d: SubscriberRow) => d.id === id);
          return sub?.bannedAt != null;
        })}
      />

      {/* Mobile Card Layout */}
      <div className="grid gap-3 md:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex gap-4">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (response?.data?.length ?? 0) === 0 ? (
          <Card className="p-8 text-center">
            <EmptyState
              variant={debouncedSearch ? "search" : "users"}
              title={
                debouncedSearch
                  ? t("admin.subscribers.empty.searchTitle")
                  : t("admin.subscribers.empty.defaultTitle")
              }
              description={
                debouncedSearch
                  ? t("admin.subscribers.empty.searchDesc")
                  : t("admin.subscribers.empty.defaultDesc")
              }
            />
          </Card>
        ) : (
          response?.data?.map((sub: SubscriberRow) => (
            <Card
              key={sub.id}
              className={cn(
                "p-4 transition-colors",
                sub.deletedAt && "opacity-50",
                selectedIds.has(sub.id) && "bg-muted/50 border-primary"
              )}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedIds.has(sub.id)}
                  onCheckedChange={(checked: boolean | string) =>
                    handleSelectOne(sub.id, checked === true)
                  }
                  aria-label={t("admin.subscribers.selectAria", { name: sub.name })}
                  disabled={bulkLoading}
                  className="mt-1 h-5 w-5"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-medium">{sub.name}</span>
                      {sub.isAdmin && (
                        <Badge variant="outline" className="h-4 shrink-0 px-1 py-0 text-[10px]">
                          {t("admin.subscribers.adminBadge")}
                        </Badge>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="-me-2 h-7 w-7 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">{t("admin.common.actions")}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/subscribers/${sub.id}`}>
                            {t("admin.subscribers.viewDetails")}
                          </Link>
                        </DropdownMenuItem>
                        {!sub.deletedAt && (
                          <>
                            <DropdownMenuItem onClick={() => setEditTarget(sub)}>
                              <UserPen className="me-2 h-4 w-4" />
                              {t("admin.common.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setBanTarget(sub)}
                              className={sub.bannedAt ? "text-success-11" : "text-warning-11"}
                            >
                              {sub.bannedAt ? (
                                <>
                                  <ShieldCheck className="me-2 h-4 w-4" />{" "}
                                  {t("admin.subscribers.unban")}
                                </>
                              ) : (
                                <>
                                  <ShieldOff className="me-2 h-4 w-4" />{" "}
                                  {t("admin.subscribers.ban")}
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(sub)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="me-2 h-4 w-4" />
                              {t("admin.common.delete")}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="text-muted-foreground truncate text-xs">{sub.email}</div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <PlanBadge plan={sub.plan} />
                    <StatusBadge
                      isSuspended={sub.isSuspended}
                      bannedAt={sub.bannedAt}
                      deletedAt={sub.deletedAt}
                      trialEndsAt={sub.trialEndsAt}
                    />
                    <span className="text-muted-foreground ms-auto text-xs">
                      {format(new Date(sub.createdAt), "MMM d, yy")}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="bg-card hidden rounded-lg border md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={
                        selectedIds.size > 0 &&
                        selectedIds.size === (response?.data?.length ?? 0) &&
                        (response?.data?.length ?? 0) > 0
                      }
                      indeterminate={
                        selectedIds.size > 0 && selectedIds.size < (response?.data?.length ?? 0)
                      }
                      onCheckedChange={handleSelectAll}
                      aria-label={t("admin.subscribers.selectAllAria")}
                      disabled={bulkLoading || (response?.data?.length ?? 0) === 0}
                      className="h-5 w-5"
                    />
                  </div>
                </TableHead>
                <TableHead>{t("admin.subscribers.table.subscriber")}</TableHead>
                <TableHead className="hidden md:table-cell">
                  <button
                    className="hover:text-foreground flex items-center gap-1"
                    onClick={() => toggleSort("plan")}
                  >
                    {t("admin.subscribers.table.plan")} <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  {t("admin.subscribers.table.status")}
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  {t("admin.subscribers.table.platforms")}
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <button
                    className="hover:text-foreground flex items-center gap-1"
                    onClick={() => toggleSort("createdAt")}
                  >
                    {t("admin.subscribers.table.joined")} <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </TableHead>
                <TableHead className="w-10 text-end" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (response?.data?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState
                      variant={debouncedSearch ? "search" : "users"}
                      title={
                        debouncedSearch
                          ? t("admin.subscribers.empty.searchTitle")
                          : t("admin.subscribers.empty.defaultTitle")
                      }
                      description={
                        debouncedSearch
                          ? t("admin.subscribers.empty.searchDesc")
                          : t("admin.subscribers.empty.defaultDesc")
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                response?.data?.map((sub: SubscriberRow) => (
                  <TableRow
                    key={sub.id}
                    className={`${sub.deletedAt ? "opacity-50" : ""} ${
                      selectedIds.has(sub.id) ? "bg-muted/50" : ""
                    }`}
                  >
                    <TableCell>
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={selectedIds.has(sub.id)}
                          onCheckedChange={(checked: boolean | string) =>
                            handleSelectOne(sub.id, checked === true)
                          }
                          aria-label={t("admin.subscribers.selectAria", { name: sub.name })}
                          disabled={bulkLoading}
                          className="h-5 w-5"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{sub.name}</span>
                          {sub.isAdmin && (
                            <Badge variant="outline" className="h-4 px-1 py-0 text-[10px]">
                              {t("admin.subscribers.adminBadge")}
                            </Badge>
                          )}
                        </div>
                        <span className="text-muted-foreground text-xs">{sub.email}</span>
                        {/* Mobile-only additional details */}
                        <div className="mt-2 flex flex-wrap items-center gap-2 md:hidden">
                          <PlanBadge plan={sub.plan} />
                          <span className="text-muted-foreground text-xs sm:hidden">
                            <StatusBadge
                              isSuspended={sub.isSuspended}
                              bannedAt={sub.bannedAt}
                              deletedAt={sub.deletedAt}
                              trialEndsAt={sub.trialEndsAt}
                            />
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <PlanBadge plan={sub.plan} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <StatusBadge
                        isSuspended={sub.isSuspended}
                        bannedAt={sub.bannedAt}
                        deletedAt={sub.deletedAt}
                        trialEndsAt={sub.trialEndsAt}
                      />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm tabular-nums">{sub.connectedPlatforms}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
                      {format(new Date(sub.createdAt), "d MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">{t("admin.common.actions")}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/subscribers/${sub.id}`}>
                              {t("admin.subscribers.viewDetails")}
                            </Link>
                          </DropdownMenuItem>
                          {!sub.deletedAt && (
                            <>
                              <DropdownMenuItem onClick={() => setEditTarget(sub)}>
                                <UserPen className="me-2 h-4 w-4" />
                                {t("admin.common.edit")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setBanTarget(sub)}
                                className={sub.bannedAt ? "text-success-11" : "text-warning-11"}
                              >
                                {sub.bannedAt ? (
                                  <>
                                    <ShieldCheck className="me-2 h-4 w-4" />{" "}
                                    {t("admin.subscribers.unban")}
                                  </>
                                ) : (
                                  <>
                                    <ShieldOff className="me-2 h-4 w-4" />{" "}
                                    {t("admin.subscribers.ban")}
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(sub)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="me-2 h-4 w-4" />
                                {t("admin.common.delete")}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {response?.pagination?.totalPages && response.pagination.totalPages > 1 && (
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>
            {(page - 1) * response.pagination.limit + 1}–
            {Math.min(page * response.pagination.limit, response.pagination.total)}{" "}
            {t("admin.common.of")} {response.pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4 rtl:scale-x-[-1]" />
            </Button>
            <span className="px-2">
              {page} / {response.pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= response.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AddSubscriberDialog open={addOpen} onOpenChange={setAddOpen} onSuccess={refresh} />
      {editTarget && (
        <EditSubscriberDialog
          open={!!editTarget}
          onOpenChange={(v) => {
            if (!v) setEditTarget(null);
          }}
          subscriber={editTarget}
          onSuccess={refresh}
        />
      )}
      {banTarget && (
        <BanDialog
          open={!!banTarget}
          onOpenChange={(v) => {
            if (!v) setBanTarget(null);
          }}
          subscriberId={banTarget.id}
          subscriberName={banTarget.name}
          isBanned={!!banTarget.bannedAt}
          onSuccess={refresh}
        />
      )}
      {deleteTarget && (
        <DeleteDialog
          open={!!deleteTarget}
          onOpenChange={(v) => {
            if (!v) setDeleteTarget(null);
          }}
          subscriberId={deleteTarget.id}
          subscriberName={deleteTarget.name}
          onSuccess={refresh}
        />
      )}

      {/* Bulk dialogs */}
      <BulkBanDialog
        open={bulkBanOpen}
        onOpenChange={setBulkBanOpen}
        selectedIds={Array.from(selectedIds)}
        selectedNames={
          response?.data
            ?.filter((d: SubscriberRow) => selectedIds.has(d.id))
            .slice(0, 3)
            .map((d: SubscriberRow) => d.name) ?? []
        }
        isBanning={bulkBanMode === "ban"}
        onSuccess={handleBulkSuccess}
      />
      <BulkChangePlanDialog
        open={bulkChangePlanOpen}
        onOpenChange={setBulkChangePlanOpen}
        selectedIds={Array.from(selectedIds)}
        selectedCount={selectedIds.size}
        onSuccess={handleBulkSuccess}
      />
      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        selectedIds={Array.from(selectedIds)}
        selectedCount={selectedIds.size}
        onSuccess={handleBulkSuccess}
      />
    </div>
  );
}
