"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { clientLogger } from "@/lib/client-logger";

interface BillingPortalError {
  error?: string;
  code?: string;
}

export function ManageSubscriptionButton() {
  const t = useTranslations("settings");
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
          toast.error(t("billing.no_billing_profile"));
          window.location.href = "/pricing?billing=restore";
          return; // Don't reset loading — navigating away
        }

        if (res.status === 503) {
          toast.error(t("billing.service_unavailable"));
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
      toast.error(t("billing.something_wrong"));
      setLoading(false); // Only reset on error
    }
  };

  return (
    <Button variant="outline" onClick={handleManage} disabled={loading}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {t("billing.manage_subscription")}
    </Button>
  );
}
