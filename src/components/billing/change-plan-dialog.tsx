"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Spinner } from "@/components/ui/spinner";

interface ChangePlanPreview {
  currentPlan: string;
  targetPlan: string;
  effectiveDate: string;
  proratedCredit: string | null;
  newMonthlyPrice: string | null;
  featuresLost: string[];
  featuresGained: string[];
  overLimits: {
    xAccounts?: { current: number; newLimit: number; action: string };
    scheduledPosts?: { current: number; newLimit: number; action: string };
  };
}

interface ChangePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: string;
  planLabel: string;
  isUpgrade?: boolean;
}

export function ChangePlanDialog({
  open,
  onOpenChange,
  plan,
  planLabel,
  isUpgrade = false,
}: ChangePlanDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ChangePlanPreview | null>(null);

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/change-plan/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load preview");
      }

      const data = await res.json();
      setPreview(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load plan preview");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to change plan");
      }

      const data = await res.json();
      toast.success(data.message || "Plan changed successfully");

      // If cancelling, show different message
      if (plan === "free") {
        toast.info("Your subscription will cancel at the end of your billing period");
      }

      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to change plan");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open && !preview) {
      fetchPreview();
    }
    onOpenChange(open);
  };

  const isDowngrade = !isUpgrade && (preview?.featuresLost?.length ?? 0) > 0;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Change to {planLabel}</AlertDialogTitle>
          <AlertDialogDescription>
            {loading ? "Loading preview..." : preview ? (
              <>
                Your plan will change from <strong>{preview.currentPlan.toUpperCase()}</strong> to{" "}
                <strong>{preview.targetPlan.toUpperCase()}</strong>.
              </>
            ) : (
              "Please confirm your plan change."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {preview && !loading && (
          <div className="space-y-4 py-4">
            {/* Features lost/gained */}
            {preview.featuresLost.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-destructive">Features you'll lose:</div>
                <ul className="space-y-1">
                  {preview.featuresLost.map((feature) => (
                    <li key={feature} className="text-sm flex items-start gap-2">
                      <span className="text-destructive">✗</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {preview.featuresGained.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-green-600 dark:text-green-400">Features you'll gain:</div>
                <ul className="space-y-1">
                  {preview.featuresGained.map((feature) => (
                    <li key={feature} className="text-sm flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-400">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Over-limit warnings */}
            {Object.keys(preview.overLimits).length > 0 && (
              <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
                <div className="flex items-start gap-2">
                  <span className="text-amber-500">⚠</span>
                  <div className="flex-1 space-y-1">
                    {preview.overLimits.xAccounts && (
                      <p className="text-sm">
                        You have <strong>{preview.overLimits.xAccounts.current}</strong> connected X accounts.
                        Your new plan allows <strong>{preview.overLimits.xAccounts.newLimit}</strong>.
                      </p>
                    )}
                    {preview.overLimits.scheduledPosts && (
                      <p className="text-sm">
                        You have <strong>{preview.overLimits.scheduledPosts.current}</strong> scheduled posts.
                        Your new plan allows <strong>{preview.overLimits.scheduledPosts.newLimit}</strong>.
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Please deactivate excess accounts in Settings. Scheduled posts will be moved to Drafts.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Effective date and pricing */}
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Effective:</span>
                <Badge variant={preview.effectiveDate === "Immediate" ? "default" : "secondary"}>
                  {preview.effectiveDate}
                </Badge>
              </div>
              {preview.newMonthlyPrice && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New price:</span>
                  <span className="font-medium">{preview.newMonthlyPrice}</span>
                </div>
              )}
              {preview.proratedCredit && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prorated credit:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">{preview.proratedCredit}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading || !preview}
            variant={isDowngrade ? "destructive" : "default"}
            className={isDowngrade ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {loading ? "Processing..." : isDowngrade ? "Confirm Downgrade" : "Confirm Plan Change"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
