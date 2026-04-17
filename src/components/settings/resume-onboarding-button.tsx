"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { clientLogger } from "@/lib/client-logger";

export function ResumeOnboardingButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleResumeOnboarding = async () => {
    setIsLoading(true);
    try {
      // Navigate to onboarding modal/shell which will show the wizard
      window.location.href = "/onboarding";
    } catch (error) {
      clientLogger.error("Failed to navigate to onboarding", {
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error("Failed to resume onboarding");
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="text-primary h-5 w-5" />
          <CardTitle>Resume Onboarding</CardTitle>
        </div>
        <CardDescription>Complete the setup wizard anytime</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 text-sm">
          Skipped the onboarding wizard earlier? You can resume at any time to complete your setup,
          schedule your first post, and explore AI-powered features.
        </p>
        <Button onClick={handleResumeOnboarding} disabled={isLoading}>
          {isLoading ? "Loading..." : "Resume Onboarding"}
        </Button>
      </CardContent>
    </Card>
  );
}
