"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreatePromoDialog } from "./create-promo-dialog";
import { EditPromoDialog, type PromoCode } from "./edit-promo-dialog";

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function PromoCodesTable() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PromoCode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromoCode | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promo-codes");
      const json = await res.json();
      setCodes(json.data ?? []);
    } catch {
      toast.error("Failed to load promo codes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/promo-codes/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(error);
      }
      toast.success(`Promo code "${deleteTarget.code}" deleted`);
      setDeleteTarget(null);
      fetchCodes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete promo code");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">
            {codes.length} active code{codes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create code
        </Button>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : codes.length === 0 ? (
        <div className="text-muted-foreground flex h-32 items-center justify-center rounded-lg border border-dashed text-sm">
          No promo codes yet. Create one to get started.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Redemptions</TableHead>
                <TableHead>Valid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((code) => {
                const discountLabel =
                  code.discountType === "percentage"
                    ? `${parseFloat(code.discountValue)}% off`
                    : `$${parseFloat(code.discountValue).toFixed(2)} off`;

                const redemptionLabel =
                  code.maxRedemptions !== null
                    ? `${code.redemptionsCount} / ${code.maxRedemptions}`
                    : `${code.redemptionsCount} / ∞`;

                const now = new Date();
                const expired = code.validTo ? new Date(code.validTo) < now : false;
                const notYet = code.validFrom ? new Date(code.validFrom) > now : false;

                return (
                  <TableRow key={code.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono font-semibold">{code.code}</span>
                        {code.description && (
                          <span className="text-muted-foreground text-xs">{code.description}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{discountLabel}</Badge>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">{redemptionLabel}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {code.validFrom || code.validTo ? (
                        <span>
                          {code.validFrom ? format(new Date(code.validFrom), "d MMM yyyy") : "—"}
                          {" → "}
                          {code.validTo ? format(new Date(code.validTo), "d MMM yyyy") : "∞"}
                        </span>
                      ) : (
                        <span>Always valid</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {!code.isActive ? (
                        <Badge variant="outline">Inactive</Badge>
                      ) : expired ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : notYet ? (
                        <Badge variant="secondary">Scheduled</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditTarget(code)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(code)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CreatePromoDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={fetchCodes} />

      <EditPromoDialog
        open={!!editTarget}
        onOpenChange={(v) => {
          if (!v) setEditTarget(null);
        }}
        promo={editTarget}
        onSuccess={() => {
          setEditTarget(null);
          fetchCodes();
        }}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete promo code?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.code}</strong> will be soft-deleted and immediately
              deactivated. Existing redemptions are preserved, but no new redemptions will be
              accepted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
