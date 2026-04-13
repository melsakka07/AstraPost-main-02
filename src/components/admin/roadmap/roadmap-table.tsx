"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Search,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type FeedbackStatus = "pending" | "approved" | "rejected";
type FilterOption = "pending" | "approved" | "rejected" | "all";

interface FeedbackItem {
  id: string;
  title: string;
  description: string;
  category: string;
  status: FeedbackStatus;
  upvotes: number;
  adminNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image: string | null;
    email: string;
  };
}

interface Counts {
  pending: number;
  approved: number;
  rejected: number;
}

interface PaginatedResponse {
  items: FeedbackItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: Counts;
}

const STATUS_BADGES: Record<FeedbackStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  approved: {
    label: "Approved",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

const CATEGORY_BADGES: Record<string, { label: string; className: string }> = {
  feature: {
    label: "Feature",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  bug: { label: "Bug", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  other: { label: "Other", className: "bg-muted text-muted-foreground" },
};

export function RoadmapTable() {
  const [data, setData] = useState<FeedbackItem[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0, rejected: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterOption>("pending");
  const [page, setPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [rejectTarget, setRejectTarget] = useState<FeedbackItem | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<FeedbackItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [viewTarget, setViewTarget] = useState<FeedbackItem | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const pathname = usePathname();

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
        status: filter,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      const res = await fetch(`/api/admin/roadmap?${params}`);
      if (!res.ok) throw new Error("Failed to fetch roadmap submissions");
      const json: PaginatedResponse = await res.json();
      setData(json.items);
      setCounts(json.counts);
      setPagination({
        page: json.page,
        limit: json.limit,
        total: json.total,
        totalPages: json.totalPages,
      });
    } catch (error) {
      toast.error("Failed to load roadmap submissions");
    } finally {
      setLoading(false);
    }
  }, [page, filter, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData, pathname]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [filter, page]);

  const handleApprove = async (item: FeedbackItem) => {
    try {
      const res = await fetch(`/api/admin/roadmap/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      toast.success("Feedback approved");
      fetchData();
    } catch {
      toast.error("Failed to approve feedback");
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setIsRejecting(true);
    try {
      const res = await fetch(`/api/admin/roadmap/${rejectTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", adminNotes: rejectNotes }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      toast.success("Feedback rejected");
      setRejectTarget(null);
      setRejectNotes("");
      fetchData();
    } catch {
      toast.error("Failed to reject feedback");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/roadmap/${deleteTarget.id}/delete`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Feedback deleted");
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error("Failed to delete feedback");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkAction = async (action: "approved" | "rejected") => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      const res = await fetch("/api/admin/roadmap/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: action }),
      });
      if (!res.ok) throw new Error("Failed to bulk update");
      toast.success(`${ids.length} items ${action}`);
      setSelectedIds(new Set());
      fetchData();
    } catch {
      toast.error("Failed to bulk update");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((item) => item.id)));
    }
  };

  const tabs: { value: FilterOption; label: string; count: number }[] = [
    { value: "pending", label: "Pending", count: counts.pending },
    { value: "approved", label: "Approved", count: counts.approved },
    { value: "rejected", label: "Rejected", count: counts.rejected },
    { value: "all", label: "All", count: counts.pending + counts.approved + counts.rejected },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setFilter(tab.value);
                setPage(1);
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  filter === tab.value ? "bg-primary-foreground/20" : "bg-muted-foreground/20"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by title or description..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filter === "pending" && selectedIds.size > 0 && (
        <div className="bg-muted/50 flex items-center gap-2 rounded-lg border p-3">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => handleBulkAction("approved")}>
            <ThumbsUp className="mr-2 h-4 w-4" />
            Approve Selected
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkAction("rejected")}>
            <ThumbsDown className="mr-2 h-4 w-4" />
            Reject Selected
          </Button>
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {filter === "pending" && (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === data.length && data.length > 0}
                    onChange={toggleSelectAll}
                    className="border-input h-4 w-4 rounded"
                  />
                </TableHead>
              )}
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Submitted By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {filter === "pending" && (
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                  )}
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={filter === "pending" ? 7 : 6}
                  className="text-muted-foreground h-24 text-center"
                >
                  No submissions found
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id} className={selectedIds.has(item.id) ? "bg-muted/50" : ""}>
                  {filter === "pending" && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="border-input h-4 w-4 rounded"
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="max-w-md">
                      <button
                        onClick={() => setViewTarget(item)}
                        className="text-left font-medium hover:underline"
                      >
                        {item.title}
                      </button>
                      <p className="text-muted-foreground mt-0.5 line-clamp-1 text-sm">
                        {item.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={CATEGORY_BADGES[item.category]?.className}>
                      {CATEGORY_BADGES[item.category]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={item.user.image ?? undefined} />
                        <AvatarFallback>{item.user.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{item.user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(item.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_BADGES[item.status].className}>
                      {STATUS_BADGES[item.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewTarget(item)}>
                          View Details
                        </DropdownMenuItem>
                        {item.status === "pending" && (
                          <>
                            <DropdownMenuItem onClick={() => handleApprove(item)}>
                              <ThumbsUp className="mr-2 h-4 w-4" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setRejectTarget(item)}>
                              <ThumbsDown className="mr-2 h-4 w-4" />
                              Reject
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(item)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{" "}
            results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page === pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!viewTarget} onOpenChange={() => setViewTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewTarget?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className={CATEGORY_BADGES[viewTarget?.category ?? "other"]?.className}>
                {CATEGORY_BADGES[viewTarget?.category ?? "other"]?.label}
              </Badge>
              <Badge className={STATUS_BADGES[viewTarget?.status ?? "pending"].className}>
                {STATUS_BADGES[viewTarget?.status ?? "pending"].label}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">{viewTarget?.description}</p>
            <div className="flex items-center gap-2 text-sm">
              <Avatar className="h-5 w-5">
                <AvatarImage src={viewTarget?.user.image ?? undefined} />
                <AvatarFallback>{viewTarget?.user.name[0]}</AvatarFallback>
              </Avatar>
              <span>{viewTarget?.user.name}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {viewTarget?.createdAt
                  ? format(new Date(viewTarget.createdAt), "MMM d, yyyy 'at' h:mm a")
                  : ""}
              </span>
            </div>
            {viewTarget?.adminNotes && (
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground mb-1 text-xs font-medium">Admin Notes</p>
                <p className="text-sm">{viewTarget.adminNotes}</p>
              </div>
            )}
            {viewTarget?.reviewedAt && (
              <p className="text-muted-foreground text-xs">
                Reviewed: {format(new Date(viewTarget.reviewedAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={() => {
          setRejectTarget(null);
          setRejectNotes("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Feedback</DialogTitle>
            <DialogDescription>
              Add optional notes about why this feedback is being rejected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Admin Notes (Optional)</Label>
              <Textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Reason for rejection..."
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectNotes("");
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isRejecting}>
              {isRejecting ? "Rejecting..." : "Reject Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Feedback</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this submission? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
