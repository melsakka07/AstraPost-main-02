"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface BillingPortalError {
  error?: string;
  code?: string;
}

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);

  const handleManage = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
      });

      if (!res.ok) {
        let payload: BillingPortalError | null = null;
        try {
          payload = (await res.json()) as BillingPortalError;
        } catch {
        }

        if (res.status === 401) {
          window.location.href = "/login?redirect=/dashboard/settings";
          return;
        }

        if (res.status === 400 && payload?.code === "no_subscription") {
          toast.error("No active billing profile was found. Choose a plan to continue.");
          window.location.href = "/pricing?billing=restore";
          return;
        }

        if (res.status === 503) {
          toast.error("Billing service is temporarily unavailable. Please try again.");
          return;
        }

        throw new Error(payload?.error || "Failed to create portal session");
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleManage} disabled={loading}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Manage Subscription
    </Button>
  );
}
