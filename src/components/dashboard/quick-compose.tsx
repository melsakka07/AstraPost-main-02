"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, PenSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const MAX_LENGTH = 1000;

export function QuickCompose() {
  const [content, setContent] = useState("");
  const router = useRouter();
  const hasContent = content.trim().length > 0;
  const charCount = content.length;

  const handleCompose = () => {
    if (!hasContent) return;

    // Prepend to existing drafts so Composer can pick them all up
    const existing = JSON.parse(localStorage.getItem("astra-post-drafts") || "[]");
    localStorage.setItem(
      "astra-post-drafts",
      JSON.stringify([
        { id: Math.random().toString(36).substr(2, 9), content, media: [] },
        ...existing,
      ])
    );

    router.push("/dashboard/compose");
  };

  return (
    <Card className="md:col-span-1 lg:col-span-3">
      <CardHeader className="flex flex-row items-center gap-2 px-4 py-4">
        <PenSquare className="text-muted-foreground h-4 w-4" />
        <CardTitle className="text-base sm:text-lg">Quick Compose</CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-0 pb-4">
        <div className="space-y-3">
          <div className="relative">
            <Textarea
              className="min-h-[120px] resize-none pb-8 text-sm leading-relaxed sm:min-h-[140px]"
              placeholder="Share an idea, a thread hook, or a quick update..."
              aria-label="Quick compose"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={MAX_LENGTH}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
              {hasContent && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive h-6 w-6 p-0"
                  onClick={() => setContent("")}
                  aria-label="Clear"
                  title="Clear"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
              <span className="text-muted-foreground/60 text-[11px] tabular-nums">
                {charCount}/{MAX_LENGTH}
              </span>
            </div>
          </div>
          <Button className="w-full" onClick={handleCompose} disabled={!hasContent}>
            Continue in Editor
            <ArrowRight className="ms-2 h-4 w-4 rtl:scale-x-[-1]" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
