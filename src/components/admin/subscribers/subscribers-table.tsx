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
import { DeleteDialog } from "./delete-dialog";
import { EditSubscriberDialog } from "./edit-subscriber-dialog";
import { PlanBadge, StatusBadge } from "./subscriber-badges";
import type { PaginatedResponse, SubscriberRow } from "./types";

type FilterOption = "all" | "free" | "trial" | "pro_monthly" | "pro_annual" | "agency" | "banned" | "deleted";
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

  // Dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SubscriberRow | null>(null);
  const [banTarget, setBanTarget] = useState<SubscriberRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubscriberRow | null>(null);

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
  useEffect(() => { setPage(1); }, [filter, sort, order]);

  const toggleSort = (col: SortOption) => {
    if (sort === col) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSort(col); setOrder("desc"); }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subscriber</TableHead>
              <TableHead>
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort("plan")}
                >
                  Plan <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Platforms</TableHead>
              <TableHead>
                <button
                  className="flex items-center gap-1 hover:text-foreground"
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
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No subscribers found
                </TableCell>
              </TableRow>
            ) : (
              data.map((sub) => (
                <TableRow key={sub.id} className={sub.deletedAt ? "opacity-50" : ""}>
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
                      <span className="text-xs text-muted-foreground">{sub.email}</span>
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
                  <TableCell className="text-sm text-muted-foreground">
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
                                <><ShieldCheck className="mr-2 h-4 w-4" /> Unban</>
                              ) : (
                                <><ShieldOff className="mr-2 h-4 w-4" /> Ban</>
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
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
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
            <span className="px-2">{page} / {pagination.totalPages}</span>
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
      <AddSubscriberDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={fetchData}
      />
      {editTarget && (
        <EditSubscriberDialog
          open={!!editTarget}
          onOpenChange={(v) => { if (!v) setEditTarget(null); }}
          subscriber={editTarget}
          onSuccess={fetchData}
        />
      )}
      {banTarget && (
        <BanDialog
          open={!!banTarget}
          onOpenChange={(v) => { if (!v) setBanTarget(null); }}
          subscriberId={banTarget.id}
          subscriberName={banTarget.name}
          isBanned={!!banTarget.bannedAt}
          onSuccess={fetchData}
        />
      )}
      {deleteTarget && (
        <DeleteDialog
          open={!!deleteTarget}
          onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
          subscriberId={deleteTarget.id}
          subscriberName={deleteTarget.name}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
