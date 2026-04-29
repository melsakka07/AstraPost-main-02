"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/client-error-handler";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    reportError(error, { context: "root-error", digest: error.digest });
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <AlertCircle className="text-destructive h-16 w-16" />
        </div>
        <h1 className="mb-4 text-2xl font-bold">{t("something_wrong")}</h1>
        <p className="text-muted-foreground mb-6">{t("unexpected_with_support")}</p>
        {error.digest && (
          <p className="text-muted-foreground mb-4 text-xs">
            {t("error_id", { id: error.digest })}
          </p>
        )}
        <div className="flex justify-center gap-4">
          <Button onClick={reset}>{t("try_again")}</Button>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            {t("go_home")}
          </Button>
        </div>
      </div>
    </div>
  );
}
