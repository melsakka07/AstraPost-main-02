"use client";

import { useState } from "react";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CHECKLIST_STORAGE_KEY = "setup-checklist-hidden";

export function ReopenChecklistButton() {
  const [isClicked, setIsClicked] = useState(false);

  const handleReopenChecklist = () => {
    localStorage.removeItem(CHECKLIST_STORAGE_KEY);
    setIsClicked(true);

    // Visual feedback — toast or navigate to dashboard
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 300);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Rocket className="text-primary h-5 w-5" />
          <CardTitle>Getting Started</CardTitle>
        </div>
        <CardDescription>Re-open the onboarding checklist anytime</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 text-sm">
          Dismissed the Getting Started checklist? You can bring it back at any time. It will appear
          on your dashboard to help you set up AstraPost.
        </p>
        <Button onClick={handleReopenChecklist} disabled={isClicked}>
          {isClicked ? "Redirecting..." : "Re-open Getting Started Checklist"}
        </Button>
      </CardContent>
    </Card>
  );
}
