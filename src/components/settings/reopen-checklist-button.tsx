"use client";

import { useState } from "react";
import { Rocket } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CHECKLIST_STORAGE_KEY = "setup-checklist-hidden";

export function ReopenChecklistButton() {
  const t = useTranslations("settings");
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
          <CardTitle>{t("profile.checklist_title")}</CardTitle>
        </div>
        <CardDescription>{t("profile.checklist_desc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 text-sm">{t("profile.checklist_body")}</p>
        <Button onClick={handleReopenChecklist} disabled={isClicked}>
          {isClicked ? t("profile.checklist_redirecting") : t("profile.checklist_button")}
        </Button>
      </CardContent>
    </Card>
  );
}
