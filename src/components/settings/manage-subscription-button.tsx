"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { clientLogger } from "@/lib/client-logger";

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
        } catch {}

        if (res.status === 401) {
          window.location.href = "/login?redirect=/dashboard/settings";
          return; // Don't reset loading — navigating away
        }

        if (res.status === 400 && payload?.code === "no_subscription") {
          toast.error("No active billing profile was found. Choose a plan to continue.");
          window.location.href = "/pricing?billing=restore";
          return; // Don't reset loading — navigating away
        }

        if (res.status === 503) {
          toast.error("Billing service is temporarily unavailable. Please try again.");
          setLoading(false);
          return;
        }

        throw new Error(payload?.error || "Failed to create portal session");
      }

      const { url } = await res.json();
      window.location.href = url;
      // Don't reset loading — page is navigating away
    } catch (error) {
      clientLogger.error("Failed to create billing portal session", {
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error("Something went wrong");
      setLoading(false); // Only reset on error
    }
  };

  return (
    <Button variant="outline" onClick={handleManage} disabled={loading}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Manage Subscription
    </Button>
  );
}
