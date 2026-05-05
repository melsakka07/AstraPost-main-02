"use client";

import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ── Props ──────────────────────────────────────────────────────────────

interface AttestationCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  disabled?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────

export function AttestationCheckbox({
  checked,
  onChange,
  error,
  disabled = false,
}: AttestationCheckboxProps) {
  const t = useTranslations("ai_hub");

  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-3">
        <Checkbox
          id="attestation"
          checked={checked}
          onCheckedChange={(val) => onChange(val === true)}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? "attestation-error" : undefined}
          className="mt-0.5"
        />
        <Label
          htmlFor="attestation"
          className={cn(
            "text-sm leading-relaxed",
            disabled ? "text-muted-foreground" : "text-foreground",
            error && "text-destructive"
          )}
        >
          {t("pdf_to_thread.attestation.label")}
        </Label>
      </div>
      {error && (
        <p id="attestation-error" className="text-destructive ps-7 text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
