"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface UpgradeBannerProps {
  title?: string;
  description?: string;
  className?: string;
}

export function UpgradeBanner({
  title = "Unlock Unlimited Potential",
  description = "Upgrade to Pro to remove limits and access advanced AI features.",
  className,
}: UpgradeBannerProps) {
  return (
    <Card
      className={`from-primary/10 via-primary/5 to-background border-primary/20 bg-gradient-to-r ${className}`}
    >
      <CardContent className="flex flex-col items-center justify-between gap-4 p-6 sm:flex-row">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <Sparkles className="text-primary h-5 w-5" />
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="font-semibold tracking-tight">{title}</h3>
            <p className="text-muted-foreground max-w-[500px] text-sm">{description}</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/pricing">Upgrade Now</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
