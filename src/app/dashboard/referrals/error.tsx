"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/client-error-handler";

export default function ReferralsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { context: "referrals-error", digest: error.digest });
  }, [error]);

  const t = useTranslations("errors");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertTriangle className="text-destructive h-10 w-10" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t("something_wrong")}</h2>
        <p className="text-muted-foreground text-sm">{error.message || t("unexpected")}</p>
      </div>
      <Button onClick={reset} variant="outline" size="sm">
        {t("try_again")}
      </Button>
    </div>
  );
}
