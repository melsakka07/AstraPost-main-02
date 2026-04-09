"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BlurredOverlayProps {
  isLocked: boolean;
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function BlurredOverlay({
  isLocked,
  children,
  title = "Pro Feature",
  description = "Upgrade to Pro to unlock this section.",
  className,
}: BlurredOverlayProps) {
  if (!isLocked) return <>{children}</>;

  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      <div className="pointer-events-none opacity-50 blur-sm filter select-none">{children}</div>
      <div className="bg-background/20 absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center backdrop-blur-[1px]">
        <div className="bg-primary/20 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
          <Lock className="text-primary h-6 w-6" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground mb-6 max-w-[300px] text-sm">{description}</p>
        <Button asChild>
          <Link href="/pricing">Unlock Now</Link>
        </Button>
      </div>
    </div>
  );
}
