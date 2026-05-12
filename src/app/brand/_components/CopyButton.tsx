"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

/**
 * Click-to-copy button that flips between Copy and Check icons.
 * Used throughout the brand kit page on swatches and token rows.
 */
export function CopyButton({ value, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(value);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label ?? `Copy ${value}`}
      className={
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium " +
        "text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors" +
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none" +
        (className ?? "")
      }
    >
      {copied ? (
        <Check className="h-3 w-3" aria-hidden="true" />
      ) : (
        <Copy className="h-3 w-3" aria-hidden="true" />
      )}
      <span className="font-mono">{value}</span>
    </button>
  );
}
