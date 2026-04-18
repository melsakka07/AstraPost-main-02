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

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriberId: string;
  subscriberName: string;
  onSuccess: () => void;
}

export function DeleteDialog({
  open,
  onOpenChange,
  subscriberId,
  subscriberName,
  onSuccess,
}: DeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/subscribers/${subscriberId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(error);
      }
      toast.success(`${subscriberName}'s account has been deleted and anonymised`);
      onSuccess();
      // Auto-close on success after a short delay
      setTimeout(() => {
        onOpenChange(false);
        setError(null);
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Delete failed";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{error ? "Delete failed" : "Delete subscriber?"}</AlertDialogTitle>
          {error ? (
            <div className="bg-destructive/10 border-destructive text-destructive rounded-md border p-3 text-sm">
              <div className="flex gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          ) : (
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                This will soft-delete <strong>{subscriberName}</strong>'s account and anonymise
                their personal information (name, email, avatar).
              </span>
              <span className="text-destructive block">
                All active sessions will be invalidated. Their posts, analytics, and billing records
                will remain for record-keeping. This action cannot be undone.
              </span>
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          {error ? (
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
              disabled={loading}
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
