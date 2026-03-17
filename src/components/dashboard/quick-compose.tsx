"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, PenSquare } from "lucide-react";
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

    // Save to localStorage so Composer can pick it up
    localStorage.setItem(
      "astra-post-drafts",
      JSON.stringify([
        {
          id: Math.random().toString(36).substr(2, 9),
          content,
          media: [],
        },
      ])
    );

    router.push("/dashboard/compose");
  };

  return (
    <Card className="lg:col-span-3">
      <CardHeader className="flex flex-row items-center gap-2">
        <PenSquare className="h-4 w-4 text-muted-foreground" />
        <CardTitle>Quick Compose</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="relative">
            <Textarea
              className="min-h-[140px] resize-none pb-8 text-sm leading-relaxed"
              placeholder="Share an idea, a thread hook, or a quick update..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={MAX_LENGTH}
            />
            <span className="absolute bottom-2.5 right-3 text-[11px] tabular-nums text-muted-foreground/60">
              {charCount}/{MAX_LENGTH}
            </span>
          </div>
          <Button
            className="w-full"
            onClick={handleCompose}
            disabled={!hasContent}
          >
            Continue in Editor
            <ArrowRight className="ms-2 h-4 w-4 rtl:scale-x-[-1]" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
