"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Search, FileDown } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAndDownloadCsv } from "@/lib/export";
import type { adminAuditActionEnum } from "@/lib/schema";

type AuditAction = (typeof adminAuditActionEnum.enumValues)[number];

export interface AuditLogRow {
  id: string;
  action: AuditAction;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  adminId: string;
  adminName: string | null;
  adminEmail: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Actions" },
  { value: "ban", label: "Ban" },
  { value: "unban", label: "Unban" },
  { value: "delete_user", label: "Delete User" },
  { value: "suspend", label: "Suspend" },
  { value: "unsuspend", label: "Unsuspend" },
  { value: "impersonate_start", label: "Impersonate Start" },
  { value: "impersonate_end", label: "Impersonate End" },
  { value: "plan_change", label: "Plan Change" },
  { value: "feature_flag_toggle", label: "Feature Flag Toggle" },
  { value: "promo_create", label: "Create Promo" },
  { value: "promo_update", label: "Update Promo" },
  { value: "promo_delete", label: "Delete Promo" },
  { value: "announcement_update", label: "Update Announcement" },
  { value: "subscriber_create", label: "Create Subscriber" },
  { value: "subscriber_update", label: "Update Subscriber" },
  { value: "roadmap_update", label: "Update Roadmap" },
  { value: "bulk_operation", label: "Bulk Operation" },
];

function getActionColor(action: AuditAction): string {
  const colors: Record<AuditAction, string> = {
    ban: "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20",
    unban: "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20",
    delete_user: "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20",
    suspend: "bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20",
    unsuspend: "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20",
    impersonate_start:
      "bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20",
    impersonate_end: "bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20",
    plan_change: "bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20",
    feature_flag_toggle: "bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20",
    promo_create: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-500/20",
    promo_update: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-500/20",
    promo_delete: "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20",
    announcement_update:
      "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-500/20",
    subscriber_create: "bg-teal-500/10 text-teal-700 dark:text-teal-400 hover:bg-teal-500/20",
    subscriber_update: "bg-teal-500/10 text-teal-700 dark:text-teal-400 hover:bg-teal-500/20",
    roadmap_update: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-500/20",
    bulk_operation: "bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20",
  };
  return colors[action];
}

export function AuditLogTable() {
  const [data, setData] = useState<AuditLogRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

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
        ...(action !== "all" && { action }),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(fromDate && { fromDate }),
        ...(toDate && { toDate }),
      });
      const res = await fetch(`/api/admin/audit?${params}`);
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      const json: PaginatedResponse<AuditLogRow> = await res.json();
      setData(json.data);
      setPagination(json.pagination);
    } catch {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [page, action, debouncedSearch, fromDate, toDate]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [action, fromDate, toDate]);

  const toggleDetails = (id: string) => {
    setExpandedDetails((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d MMM yyyy, HH:mm");
    } catch {
      return dateStr;
    }
  };

  const truncateDetails = (details: Record<string, unknown> | null): string => {
    if (!details) return "{}";
    const json = JSON.stringify(details);
    return json.length > 50 ? json.slice(0, 50) + "…" : json;
  };

  const handleExportAuditLog = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        ...(action !== "all" && { action }),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(fromDate && { fromDate }),
        ...(toDate && { toDate }),
      });
      await fetchAndDownloadCsv(
        `/api/admin/audit/export?${params}`,
        `audit-log-${new Date().toISOString().split("T")[0]}.csv`,
        {
          success: () => toast.success(`Exported ${pagination.total} audit entries`),
          error: (msg) => toast.error(msg),
        }
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-xs">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search by target ID…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-[160px]"
          />
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-[160px]"
          />
          {(fromDate || toDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
            >
              Clear dates
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAuditLog}
            disabled={exporting || pagination.total === 0}
          >
            <FileDown className="mr-2 h-4 w-4" />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target Type</TableHead>
              <TableHead>Target ID</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>IP Address</TableHead>
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
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              data.map((log) => (
                <>
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{log.adminName || "Unknown"}</span>
                        <span className="text-muted-foreground text-xs">{log.adminEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getActionColor(log.action)} variant="outline">
                        {log.action.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.targetType || "—"}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm text-xs">
                      {log.targetId || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      <button
                        onClick={() => toggleDetails(log.id)}
                        className="hover:text-foreground text-muted-foreground flex items-center gap-1 transition-colors"
                      >
                        <span className="max-w-[200px] truncate font-mono text-xs">
                          {truncateDetails(log.details)}
                        </span>
                        {expandedDetails.has(log.id) ? (
                          <ChevronUp className="h-3 w-3 shrink-0" />
                        ) : (
                          <ChevronDown className="h-3 w-3 shrink-0" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm text-xs">
                      {log.ipAddress || "—"}
                    </TableCell>
                  </TableRow>
                  {expandedDetails.has(log.id) && (
                    <TableRow key={`${log.id}-details`}>
                      <TableCell colSpan={7} className="bg-muted/30">
                        <div className="py-2">
                          <p className="text-muted-foreground mb-1 text-xs font-semibold">
                            Full Details:
                          </p>
                          <pre className="bg-background overflow-x-auto rounded border p-3 text-xs">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                          {log.userAgent && (
                            <>
                              <p className="text-muted-foreground mt-3 mb-1 text-xs font-semibold">
                                User Agent:
                              </p>
                              <p className="text-muted-foreground text-xs break-all">
                                {log.userAgent}
                              </p>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
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
    </div>
  );
}
