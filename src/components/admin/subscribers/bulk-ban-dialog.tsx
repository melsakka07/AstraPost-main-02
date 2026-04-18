"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    setLoading(true);
    setErrorMessage(null);
    setProgress({ processed: 0, total: selectedIds.length });

    try {
      const response = await fetch("/api/admin/subscribers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isBanning ? "ban" : "unban",
          userIds: selectedIds,
          ...(reason.trim() && { details: { reason: reason.trim() } }),
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
      setTimeout(() => {
        onOpenChange(false);
        setProgress(null);
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Action failed";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
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
          </AlertDialogDescription>
        </AlertDialogHeader>
        {errorMessage && (
          <div className="bg-destructive/10 border-destructive text-destructive rounded-md border p-3 text-sm">
            <div className="flex gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Action failed</p>
                <p className="mt-0.5 text-xs">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Reason <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              placeholder="e.g. Violating terms of service, spam, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
              disabled={loading}
              className="resize-none text-sm"
            />
          </div>
          {progress && (
            <span className="text-muted-foreground block text-xs">
              Processing {progress.processed} of {progress.total}...
            </span>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          {errorMessage ? (
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className={
                isBanning
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {loading ? "Retrying…" : "Retry"}
            </Button>
          ) : (
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={loading}
              className={
                isBanning
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {loading ? "Processing…" : isBanning ? "Ban" : "Unban"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
