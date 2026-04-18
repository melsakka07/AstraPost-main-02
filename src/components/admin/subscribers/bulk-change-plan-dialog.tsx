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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SubscriberPlan } from "./types";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro_monthly: "Pro Monthly",
  pro_annual: "Pro Annual",
  agency: "Agency",
};

interface BulkChangePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  selectedCount: number;
  onSuccess: (processed: number, failed: number) => void;
}

const PLANS: { value: SubscriberPlan; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "pro_monthly", label: "Pro Monthly" },
  { value: "pro_annual", label: "Pro Annual" },
  { value: "agency", label: "Agency" },
];

export function BulkChangePlanDialog({
  open,
  onOpenChange,
  selectedIds,
  selectedCount,
  onSuccess,
}: BulkChangePlanDialogProps) {
  const [loading, setLoading] = useState(false);
  const [newPlan, setNewPlan] = useState<SubscriberPlan>("pro_monthly");
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!newPlan) {
      toast.error("Please select a plan");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setProgress({ processed: 0, total: selectedIds.length });

    try {
      const response = await fetch("/api/admin/subscribers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "changePlan",
          userIds: selectedIds,
          details: { plan: newPlan },
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
          `Changed plan for ${processed} user(s) to ${PLAN_LABELS[newPlan] ?? newPlan}`
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

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change plan for {selectedCount} subscriber(s)?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <span className="block">Select the new plan to apply to the selected users.</span>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Plan</label>
              <Select
                value={newPlan}
                onValueChange={(value) => setNewPlan(value as SubscriberPlan)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANS.map((plan) => (
                    <SelectItem key={plan.value} value={plan.value}>
                      {plan.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                This overrides the plan in the database. It does not automatically update Stripe
                subscriptions. Feature access changes immediately.
              </p>
            </div>
            {progress && (
              <span className="text-muted-foreground block text-xs">
                Processing {progress.processed} of {progress.total}...
              </span>
            )}
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
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          {errorMessage ? (
            <Button onClick={handleConfirm} disabled={loading}>
              {loading ? "Retrying…" : "Retry"}
            </Button>
          ) : (
            <AlertDialogAction onClick={handleConfirm} disabled={loading}>
              {loading ? "Processing…" : "Change plan"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
