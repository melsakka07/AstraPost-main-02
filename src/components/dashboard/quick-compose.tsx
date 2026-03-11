
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function QuickCompose() {
  const [content, setContent] = useState("");
  const router = useRouter();

  const handleCompose = () => {
    if (!content.trim()) return;
    
    // Save to localStorage so Composer can pick it up
    localStorage.setItem("astra-post-drafts", JSON.stringify([{
      id: Math.random().toString(36).substr(2, 9),
      content,
      media: []
    }]));
    
    router.push("/dashboard/compose");
  };

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>Quick Compose</CardTitle>
      </CardHeader>
      <CardContent>
         <div className="space-y-4">
            <Textarea
              className="min-h-[120px]"
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <Button className="w-full" onClick={handleCompose} disabled={!content.trim()}>
              Continue in Editor
            </Button>
         </div>
      </CardContent>
    </Card>
  );
}
