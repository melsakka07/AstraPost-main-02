"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { copyToClipboard } from "@/lib/clipboard";

export function CopyIdButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(value);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            aria-label={copied ? "Copied!" : "Copy ID"}
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="text-success-11 h-3 w-3" />
            ) : (
              <Copy className="text-muted-foreground h-3 w-3" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {copied ? "Copied!" : value}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
