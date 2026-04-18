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
import { Input } from "@/components/ui/input";

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  selectedCount: number;
  onSuccess: (processed: number, failed: number) => void;
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  selectedIds,
  selectedCount,
  onSuccess,
}: BulkDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const handleConfirm = async () => {
    setLoading(true);
    setErrorMessage(null);
    setProgress({ processed: 0, total: selectedIds.length });

    try {
      const response = await fetch("/api/admin/subscribers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
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
        toast.success(`${processed} account(s) have been deleted and anonymised`);
      } else {
        toast.warning(`Processed ${processed}, skipped ${skipped}`);
      }

      onSuccess(processed, skipped);
      setTimeout(() => {
        onOpenChange(false);
        setProgress(null);
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Permanently delete {selectedCount} subscriber(s)?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              This will soft-delete the selected accounts and anonymise their personal information
              (name, email, avatar).
            </span>
            <span className="text-destructive block text-sm">
              All active sessions will be invalidated. Their posts, analytics, and billing records
              will remain for record-keeping. This action cannot be undone.
            </span>
            <span className="text-muted-foreground block text-xs">
              Note: This does not cancel any active Stripe subscription automatically.
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
              Type <code className="bg-muted rounded px-1">DELETE</code> to confirm
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              disabled={loading}
              className="font-mono"
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Retrying…" : "Retry"}
            </Button>
          ) : (
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={loading || confirmText !== "DELETE"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Deleting…" : "Delete & anonymise"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
