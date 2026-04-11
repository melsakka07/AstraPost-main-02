"use client";

import { useState } from "react";
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

interface BulkBanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  selectedNames: string[];
  isBanning: boolean; // true = ban, false = unban
  onSuccess: (processed: number, failed: number) => void;
}

export function BulkBanDialog({
  open,
  onOpenChange,
  selectedIds,
  selectedNames,
  isBanning,
  onSuccess,
}: BulkBanDialogProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setProgress({ processed: 0, total: selectedIds.length });

    try {
      const response = await fetch("/api/admin/subscribers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isBanning ? "ban" : "unban",
          userIds: selectedIds,
        }),
        signal: AbortSignal.timeout(60000), // 60s timeout
      });

      if (!response.ok) {
        const { errors } = await response.json().catch(() => ({ errors: ["Request failed"] }));
        throw new Error(errors?.[0] || "Request failed");
      }

      const { processed, skipped } = await response.json();
      setProgress({ processed: processed + skipped, total: selectedIds.length });

      if (skipped === 0) {
        toast.success(
          isBanning
            ? `${processed} user(s) have been banned`
            : `${processed} user(s) have been unbanned`
        );
      } else {
        toast.warning(`Processed ${processed}, skipped ${skipped}`);
      }

      onSuccess(processed, skipped);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const displayCount = selectedNames.length;
  const displayNames = displayCount <= 3 ? selectedNames.join(", ") : `${displayCount} subscribers`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBanning ? "Ban selected subscribers?" : "Unban selected subscribers?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              {isBanning
                ? `This will immediately suspend the following subscriber(s) and invalidate all their active sessions: ${displayNames}`
                : `This will restore access for the following subscriber(s): ${displayNames}`}
            </span>
            {progress && (
              <span className="text-muted-foreground block text-xs">
                Processing {progress.processed} of {progress.total}...
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={
              isBanning ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""
            }
          >
            {loading ? "Processing…" : isBanning ? "Ban" : "Unban"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
