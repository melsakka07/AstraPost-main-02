"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

/**
 * Listens for the "x-reconnect-required" custom event dispatched by
 * {@link fetchWithAuth} when an API call returns 401 with an
 * X-token-specific error code (X_SESSION_EXPIRED, X_TOKEN_EXPIRED,
 * or X_ACCOUNT_INACTIVE).
 *
 * Instead of a full redirect to /login → x.com OAuth, the user sees
 * an in-app toast with a "Reconnect" action that navigates to
 * Settings → Integrations where the existing reconnect flow lives.
 *
 * Add this component once inside the dashboard layout.
 */
export function XReconnectListener() {
  const router = useRouter();
  const t = useTranslations("dashboard_shell");

  useEffect(() => {
    const controller = new AbortController();

    const handleReconnectRequired = () => {
      toast.error(t("x_reconnect_required.title"), {
        description: t("x_reconnect_required.description"),
        action: {
          label: t("x_reconnect_required.action"),
          onClick: () => router.push("/dashboard/settings/integrations"),
        },
        duration: 15000, // 15 seconds — give user time to read
      });
    };

    window.addEventListener("x-reconnect-required", handleReconnectRequired, {
      signal: controller.signal,
    });

    return () => controller.abort();
  }, [router, t]);

  // This component renders nothing — it only wires the event listener
  return null;
}
