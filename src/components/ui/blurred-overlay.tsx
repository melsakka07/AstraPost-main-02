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
      <div className="blur-sm select-none pointer-events-none opacity-50 filter">
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/20 backdrop-blur-[1px] p-6 text-center">
        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-[300px] mb-6">
          {description}
        </p>
        <Button asChild>
          <Link href="/pricing">Unlock Now</Link>
        </Button>
      </div>
    </div>
  );
}
