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
    <Card className={`bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20 ${className}`}>
      <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="font-semibold tracking-tight">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-[500px]">
              {description}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/pricing">Upgrade Now</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
