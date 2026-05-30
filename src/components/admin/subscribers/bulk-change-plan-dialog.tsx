"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
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

interface BulkChangePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  selectedCount: number;
  onSuccess: (processed: number, failed: number) => void;
}

export function BulkChangePlanDialog({
  open,
  onOpenChange,
  selectedIds,
  selectedCount,
  onSuccess,
}: BulkChangePlanDialogProps) {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [newPlan, setNewPlan] = useState<SubscriberPlan>("pro_monthly");
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const planLabels = {
    free: t("admin.plans.free"),
    pro_monthly: t("admin.plans.proMonthly"),
    pro_annual: t("admin.plans.proAnnual"),
    agency: t("admin.plans.agency"),
  };

  const plans: { value: SubscriberPlan; label: string }[] = [
    { value: "free", label: t("admin.plans.free") },
    { value: "pro_monthly", label: t("admin.plans.proMonthly") },
    { value: "pro_annual", label: t("admin.plans.proAnnual") },
    { value: "agency", label: t("admin.plans.agency") },
  ];

  const handleConfirm = async () => {
    if (!newPlan) {
      toast.error(t("admin.subscribers.bulk.selectPlanError"));
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
          t("admin.subscribers.bulk.changedToast", {
            N: processed,
            plan: planLabels[newPlan] ?? newPlan,
          })
        );
      } else {
        toast.warning(t("admin.subscribers.bulk.processedToast", { processed, skipped }));
      }

      onSuccess(processed, skipped);
      setTimeout(() => {
        onOpenChange(false);
        setProgress(null);
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("admin.subscribers.bulk.actionFailed");
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("admin.subscribers.bulk.changePlanTitle", { N: selectedCount })}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <span className="block">{t("admin.subscribers.bulk.changePlanDesc")}</span>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("admin.subscribers.bulk.newPlanLabel")}
              </label>
              <Select
                value={newPlan}
                onValueChange={(value) => setNewPlan(value as SubscriberPlan)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.value} value={plan.value}>
                      {plan.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                {t("admin.subscribers.bulk.planOverrideHint")}
              </p>
            </div>
            {progress && (
              <span className="text-muted-foreground block text-xs">
                {t("admin.subscribers.bulk.processing", {
                  processed: progress.processed,
                  total: progress.total,
                })}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {errorMessage && (
          <div className="bg-destructive/10 border-destructive text-destructive rounded-md border p-3 text-sm">
            <div className="flex gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">{t("admin.subscribers.bulk.actionFailed")}</p>
                <p className="mt-0.5 text-xs">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{t("admin.common.cancel")}</AlertDialogCancel>
          {errorMessage ? (
            <Button onClick={handleConfirm} disabled={loading}>
              {loading ? t("admin.common.retrying") : t("admin.common.retry")}
            </Button>
          ) : (
            <AlertDialogAction onClick={handleConfirm} disabled={loading}>
              {loading
                ? t("admin.common.processing")
                : t("admin.subscribers.bulk.changePlanButton")}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
