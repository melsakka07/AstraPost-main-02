"use client";

import React, { useEffect, useRef, useState } from "react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fetchAndDownloadCsv } from "@/lib/export";
import {
  ACTION_LABELS,
  ACTION_DESCRIPTIONS,
  ACTION_SEVERITY,
  getActionSeverityClasses,
  type AuditAction,
} from "./action-labels";
import { useAdminPolling } from "../use-admin-polling";

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

const ACTION_OPTIONS = [
  { value: "all", label: "All Actions" },
  ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
];

function formatDetails(details: Record<string, unknown> | null): React.ReactNode {
  if (!details) return <span className="text-muted-foreground text-xs">No details</span>;

  const lines: string[] = [];
  if (details.reason) lines.push(`Reason: ${details.reason}`);
  if (details.fromPlan) lines.push(`From plan: ${String(details.fromPlan).replace(/_/g, " ")}`);
  if (details.toPlan) lines.push(`To plan: ${String(details.toPlan).replace(/_/g, " ")}`);
  if (details.email) lines.push(`Email: ${details.email}`);
  if (details.flagKey) lines.push(`Flag: ${details.flagKey}`);
  if (details.newValue !== undefined) lines.push(`New value: ${String(details.newValue)}`);
  if (details.count) lines.push(`Affected: ${details.count} users`);

  return (
    <div className="space-y-1">
      {lines.length > 0 && (
        <ul className="space-y-0.5 text-sm">
          {lines.map((l) => (
            <li key={l} className="text-foreground">
              {l}
            </li>
          ))}
        </ul>
      )}
      {/* Always show full JSON below for completeness */}
      <pre className="text-muted-foreground bg-muted mt-2 overflow-auto rounded p-2 text-xs">
        {JSON.stringify(details, null, 2)}
      </pre>
    </div>
  );
}

export function AuditLogTable() {
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

  const { data: response, loading } = useAdminPolling<PaginatedResponse<AuditLogRow>>({
    fetchFn: async (signal: AbortSignal) => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        ...(action !== "all" && { action }),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(fromDate && { fromDate }),
        ...(toDate && { toDate }),
      });
      const res = await fetch(`/api/admin/audit?${params}`, { signal });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return (await res.json()) as PaginatedResponse<AuditLogRow>;
    },
    intervalMs: 60_000,
  });

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
          success: () => toast.success(`Exported ${response?.pagination.total ?? 0} audit entries`),
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
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs font-medium">From</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs font-medium">To</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-[160px]"
            />
          </div>
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
            disabled={exporting || (response?.pagination.total ?? 0) === 0}
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
            ) : (response?.data.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground h-32 text-center">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              response?.data.map((log: AuditLogRow) => (
                <React.Fragment key={log.id}>
                  <TableRow>
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
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              className={getActionSeverityClasses(
                                ACTION_SEVERITY[log.action] ?? "low"
                              )}
                              variant="outline"
                            >
                              {ACTION_LABELS[log.action] ?? log.action}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            {ACTION_DESCRIPTIONS[log.action]}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/30">
                        <div className="py-2">
                          <p className="text-muted-foreground mb-1 text-xs font-semibold">
                            Details:
                          </p>
                          {formatDetails(log.details)}
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
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {response?.pagination.totalPages && response.pagination.totalPages > 1 && (
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>
            {(page - 1) * response.pagination.limit + 1}–
            {Math.min(page * response.pagination.limit, response.pagination.total)} of{" "}
            {response.pagination.total}
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
              {page} / {response.pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= response.pagination.totalPages}
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
