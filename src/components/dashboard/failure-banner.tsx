"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function FailureBanner({ hasFailures }: { hasFailures: boolean }) {
  const t = useTranslations("dashboard_shell");
  const [visible, setVisible] = useState(hasFailures);

  useEffect(() => {
    setVisible(hasFailures);
  }, [hasFailures]);

  if (!visible) return null;

  return (
    <div className="bg-destructive/10 text-destructive dark:bg-destructive/20 relative flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span className="font-medium">{t("failure_banner.title")}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="link"
          size="sm"
          className="text-destructive decoration-destructive hover:text-destructive/80 h-auto p-0 underline underline-offset-4"
          asChild
        >
          <Link href="/dashboard/queue">{t("failure_banner.retry")}</Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:bg-destructive/10 -mr-1 h-6 w-6"
          onClick={() => setVisible(false)}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">{t("failure_banner.dismiss")}</span>
        </Button>
      </div>
    </div>
  );
}
