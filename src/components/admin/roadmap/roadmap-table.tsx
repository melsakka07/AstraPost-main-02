"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { useTranslations } from "next-intl";
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

interface RoadmapTableProps {
  initialData?: FeedbackItem[] | null;
}

export function RoadmapTable({ initialData }: RoadmapTableProps = {}) {
  const t = useTranslations();

  const STATUS_BADGES: Record<FeedbackStatus, { label: string; className: string }> = {
    pending: {
      label: t("admin.roadmap.status.pending"),
      className: "bg-warning-3 text-warning-11",
    },
    approved: {
      label: t("admin.roadmap.status.approved"),
      className: "bg-success-3 text-success-11",
    },
    rejected: {
      label: t("admin.roadmap.status.rejected"),
      className: "bg-danger-3 text-danger-11",
    },
  };

  const CATEGORY_BADGES: Record<string, { label: string; className: string }> = {
    feature: {
      label: t("admin.roadmap.category.feature"),
      className: "bg-info-3 text-info-11",
    },
    bug: {
      label: t("admin.roadmap.category.bug"),
      className: "bg-danger-3 text-danger-11",
    },
    other: {
      label: t("admin.roadmap.category.other"),
      className: "bg-muted text-muted-foreground",
    },
  };

  const [data, setData] = useState<FeedbackItem[]>(initialData ?? []);
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0, rejected: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(initialData === null);
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
      toast.error(t("admin.roadmap.loadError"));
    } finally {
      setLoading(false);
    }
  }, [page, filter, debouncedSearch]);

  useEffect(() => {
    if (!initialData) {
      fetchData();
    }
  }, [fetchData, initialData]);

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
      toast.success(t("admin.roadmap.approvedToast"));
      fetchData();
    } catch {
      toast.error(t("admin.roadmap.approveError"));
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
      toast.success(t("admin.roadmap.rejectedToast"));
      setRejectTarget(null);
      setRejectNotes("");
      fetchData();
    } catch {
      toast.error(t("admin.roadmap.rejectError"));
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
      toast.success(t("admin.roadmap.deletedToast"));
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error(t("admin.roadmap.deleteError"));
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
      toast.success(t("admin.roadmap.bulkToast", { N: ids.length, action }));
      setSelectedIds(new Set());
      fetchData();
    } catch {
      toast.error(t("admin.roadmap.bulkError"));
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
    { value: "pending", label: t("admin.roadmap.status.pending"), count: counts.pending },
    { value: "approved", label: t("admin.roadmap.status.approved"), count: counts.approved },
    { value: "rejected", label: t("admin.roadmap.status.rejected"), count: counts.rejected },
    {
      value: "all",
      label: t("admin.roadmap.filter.all"),
      count: counts.pending + counts.approved + counts.rejected,
    },
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
          <Search className="text-muted-foreground inset-inline-start-3 absolute top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t("admin.roadmap.searchPlaceholder")}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="ps-9"
          />
        </div>
      </div>

      {filter === "pending" && selectedIds.size > 0 && (
        <div className="bg-muted/50 flex items-center gap-2 rounded-lg border p-3">
          <span className="text-sm font-medium">
            {t("admin.roadmap.selected", { N: selectedIds.size })}
          </span>
          <Button size="sm" variant="outline" onClick={() => handleBulkAction("approved")}>
            <ThumbsUp className="me-2 h-4 w-4" />
            {t("admin.roadmap.approveSelected")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkAction("rejected")}>
            <ThumbsDown className="me-2 h-4 w-4" />
            {t("admin.roadmap.rejectSelected")}
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
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
              <TableHead>{t("admin.roadmap.table.title")}</TableHead>
              <TableHead>{t("admin.roadmap.table.category")}</TableHead>
              <TableHead>{t("admin.roadmap.table.submittedBy")}</TableHead>
              <TableHead>{t("admin.roadmap.table.date")}</TableHead>
              <TableHead>{t("admin.roadmap.table.status")}</TableHead>
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
                  {t("admin.roadmap.empty")}
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
                        className="text-start font-medium hover:underline"
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
                      <span className="text-sm" dir="auto">
                        {item.user.name}
                      </span>
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
                          <span className="sr-only">{t("admin.common.actions")}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewTarget(item)}>
                          {t("admin.roadmap.viewDetails")}
                        </DropdownMenuItem>
                        {item.status === "pending" && (
                          <>
                            <DropdownMenuItem onClick={() => handleApprove(item)}>
                              <ThumbsUp className="me-2 h-4 w-4" />
                              {t("admin.roadmap.approve")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setRejectTarget(item)}>
                              <ThumbsDown className="me-2 h-4 w-4" />
                              {t("admin.roadmap.reject")}
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(item)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="me-2 h-4 w-4" />
                          {t("admin.common.delete")}
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
            {t("admin.roadmap.pagination", {
              from: (pagination.page - 1) * pagination.limit + 1,
              to: Math.min(pagination.page * pagination.limit, pagination.total),
              total: pagination.total,
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4 rtl:scale-x-[-1]" />
            </Button>
            <span className="text-sm">
              {t("admin.roadmap.pageOf", {
                current: pagination.page,
                total: pagination.totalPages,
              })}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page === pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" />
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
              <span dir="auto">{viewTarget?.user.name}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {viewTarget?.createdAt
                  ? format(new Date(viewTarget.createdAt), "MMM d, yyyy 'at' h:mm a")
                  : ""}
              </span>
            </div>
            {viewTarget?.adminNotes && (
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground mb-1 text-xs font-medium">
                  {t("admin.roadmap.adminNotes")}
                </p>
                <p className="text-sm">{viewTarget.adminNotes}</p>
              </div>
            )}
            {viewTarget?.reviewedAt && (
              <p className="text-muted-foreground text-xs">
                {t("admin.roadmap.reviewed")}:{" "}
                {format(new Date(viewTarget.reviewedAt), "MMM d, yyyy 'at' h:mm a")}
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
            <DialogTitle>{t("admin.roadmap.rejectDialogTitle")}</DialogTitle>
            <DialogDescription>{t("admin.roadmap.rejectDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("admin.roadmap.adminNotesOptional")}</Label>
              <Textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder={t("admin.roadmap.rejectPlaceholder")}
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
              {t("admin.common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isRejecting}>
              {isRejecting ? t("admin.roadmap.rejecting") : t("admin.roadmap.rejectFeedback")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.roadmap.deleteDialogTitle")}</DialogTitle>
            <DialogDescription>{t("admin.roadmap.deleteDialogDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("admin.common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? t("admin.common.deleting") : t("admin.common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
