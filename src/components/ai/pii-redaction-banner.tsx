"use client";

import { useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface PiiRedactionBannerProps {
  redactions: string[] | undefined;
}

export function PiiRedactionBanner({ redactions }: PiiRedactionBannerProps) {
  const t = useTranslations("ai");
  const [dismissed, setDismissed] = useState(false);

  if (!redactions || redactions.length === 0 || dismissed) return null;

  return (
    <div className="border-warning-6 bg-warning-2 text-warning-11 flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>
        {t("pii_redaction_notice")}: {redactions.join(", ")}
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-auto shrink-0 rounded-sm opacity-70 hover:opacity-100"
        aria-label={t("dismiss")}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
