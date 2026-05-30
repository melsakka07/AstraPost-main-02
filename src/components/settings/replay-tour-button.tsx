"use client";

import { Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ReplayTourButton() {
  const t = useTranslations("settings");

  const handleReplayTour = () => {
    window.location.href = "/dashboard?tour=true";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Play className="text-primary h-5 w-5" />
          <CardTitle>{t("help.replay_tour")}</CardTitle>
        </div>
        <CardDescription>{t("help.replay_tour_description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleReplayTour}>{t("help.replay_tour")}</Button>
      </CardContent>
    </Card>
  );
}
