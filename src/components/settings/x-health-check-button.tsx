"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function XHealthCheckButton() {
  const t = useTranslations("settings");
  const [isPending, setIsPending] = useState(false);

  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={async () => {
        setIsPending(true);
        try {
          const res = await fetch("/api/x/health", { method: "GET" });
          const data = await res.json().catch(() => null);
          if (!res.ok || !data?.ok) {
            throw new Error(data?.error || t("integrations.health_check_failed"));
          }
          toast.success(t("integrations.health_check_passed", { username: data.user.username }));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t("integrations.health_check_failed"));
        } finally {
          setIsPending(false);
        }
      }}
    >
      {isPending ? t("integrations.health_checking") : t("integrations.health_check")}
    </Button>
  );
}
