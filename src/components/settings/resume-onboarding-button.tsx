"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { clientLogger } from "@/lib/client-logger";

export function ResumeOnboardingButton() {
  const t = useTranslations("settings");
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
      toast.error(t("toasts.resume_onboarding_failed"));
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="text-primary h-5 w-5" />
          <CardTitle>{t("profile.onboarding_title")}</CardTitle>
        </div>
        <CardDescription>{t("profile.onboarding_desc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 text-sm">{t("profile.onboarding_body")}</p>
        <Button onClick={handleResumeOnboarding} disabled={isLoading}>
          {isLoading ? t("profile.onboarding_loading") : t("profile.onboarding_button")}
        </Button>
      </CardContent>
    </Card>
  );
}
