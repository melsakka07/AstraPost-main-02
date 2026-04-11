"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const FILTER_PILLS: { value: FilterOption; label: string }[] = [
  { value: "all", label: "All" },
  { value: "free", label: "Free" },
  { value: "trial", label: "Trial" },
  { value: "pro_monthly", label: "Pro Monthly" },
  { value: "pro_annual", label: "Pro Annual" },
  { value: "agency", label: "Agency" },
  { value: "banned", label: "Banned" },
  { value: "deleted", label: "Deleted" },
];

export function SubscribersTable() {
  const [data, setData] = useState<SubscriberRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterOption>("all");
  const [sort, setSort] = useState<SortOption>("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

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
      setSelectedIds(new Set(data.map((d) => d.id)));
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
    void fetchData();
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

      toast.success(`Exported ${selectedIds.size} user(s)`);
      handleClearSelection();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBulkLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        filter,
        sort,
        order,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      const res = await fetch(`/api/admin/subscribers?${params}`);
      if (!res.ok) throw new Error("Failed to fetch subscribers");
      const json: PaginatedResponse<SubscriberRow> = await res.json();
      setData(json.data);
      setPagination(json.pagination);
    } catch {
      toast.error("Failed to load subscribers");
    } finally {
      setLoading(false);
    }
  }, [page, filter, sort, order, debouncedSearch]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

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
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add subscriber
        </Button>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {FILTER_PILLS.map((pill) => (
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
          const sub = data.find((d) => d.id === id);
          return sub?.bannedAt != null;
        })}
      />

      {/* Table */}
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedIds.size > 0 && selectedIds.size === data.length && data.length > 0
                  }
                  indeterminate={selectedIds.size > 0 && selectedIds.size < data.length}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                  disabled={bulkLoading || data.length === 0}
                />
              </TableHead>
              <TableHead>Subscriber</TableHead>
              <TableHead>
                <button
                  className="hover:text-foreground flex items-center gap-1"
                  onClick={() => toggleSort("plan")}
                >
                  Plan <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Platforms</TableHead>
              <TableHead>
                <button
                  className="hover:text-foreground flex items-center gap-1"
                  onClick={() => toggleSort("createdAt")}
                >
                  Joined <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </TableHead>
              <TableHead className="w-10" />
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
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground h-32 text-center">
                  No subscribers found
                </TableCell>
              </TableRow>
            ) : (
              data.map((sub) => (
                <TableRow
                  key={sub.id}
                  className={`${sub.deletedAt ? "opacity-50" : ""} ${
                    selectedIds.has(sub.id) ? "bg-muted/50" : ""
                  }`}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(sub.id)}
                      onCheckedChange={(checked: boolean | string) =>
                        handleSelectOne(sub.id, checked === true)
                      }
                      aria-label={`Select ${sub.name}`}
                      disabled={bulkLoading}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{sub.name}</span>
                        {sub.isAdmin && (
                          <Badge variant="outline" className="h-4 px-1 py-0 text-[10px]">
                            admin
                          </Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground text-xs">{sub.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <PlanBadge plan={sub.plan} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      isSuspended={sub.isSuspended}
                      bannedAt={sub.bannedAt}
                      deletedAt={sub.deletedAt}
                      trialEndsAt={sub.trialEndsAt}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm tabular-nums">{sub.connectedPlatforms}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(sub.createdAt), "d MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/subscribers/${sub.id}`}>View details</Link>
                        </DropdownMenuItem>
                        {!sub.deletedAt && (
                          <>
                            <DropdownMenuItem onClick={() => setEditTarget(sub)}>
                              <UserPen className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setBanTarget(sub)}
                              className={sub.bannedAt ? "text-green-600" : "text-amber-600"}
                            >
                              {sub.bannedAt ? (
                                <>
                                  <ShieldCheck className="mr-2 h-4 w-4" /> Unban
                                </>
                              ) : (
                                <>
                                  <ShieldOff className="mr-2 h-4 w-4" /> Ban
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(sub)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
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

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>
            {(page - 1) * pagination.limit + 1}–
            {Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2">
              {page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AddSubscriberDialog open={addOpen} onOpenChange={setAddOpen} onSuccess={fetchData} />
      {editTarget && (
        <EditSubscriberDialog
          open={!!editTarget}
          onOpenChange={(v) => {
            if (!v) setEditTarget(null);
          }}
          subscriber={editTarget}
          onSuccess={fetchData}
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
          onSuccess={fetchData}
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
          onSuccess={fetchData}
        />
      )}

      {/* Bulk dialogs */}
      <BulkBanDialog
        open={bulkBanOpen}
        onOpenChange={setBulkBanOpen}
        selectedIds={Array.from(selectedIds)}
        selectedNames={data
          .filter((d) => selectedIds.has(d.id))
          .slice(0, 3)
          .map((d) => d.name)}
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
