"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface NotificationSettings {
  postFailures: boolean;
  aiQuotaWarning: boolean;
  trialExpiry: boolean;
  teamInvites: boolean;
}

interface NotificationPreferencesProps {
  initialSettings: NotificationSettings;
}

export function NotificationPreferences({ initialSettings }: NotificationPreferencesProps) {
  const t = useTranslations("settings");
  const [settings, setSettings] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const isDirty = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  // UA-A15: Warn before navigating away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleToggle = async (key: keyof NotificationSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    setIsSaving(true);

    try {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationSettings: newSettings }),
      });

      if (!res.ok) throw new Error("Failed to save");
      toast.success(t("notifications.saved"));
    } catch (e) {
      setSettings(settings); // Revert on error
      toast.error(t("notifications.error_save"));
    } finally {
      setIsSaving(false);
    }
  };

  const notificationOptions = [
    {
      key: "postFailures" as const,
      label: t("notifications.post_failures_label"),
      description: t("notifications.post_failures_desc"),
    },
    {
      key: "aiQuotaWarning" as const,
      label: t("notifications.quota_warning_label"),
      description: t("notifications.quota_warning_desc"),
    },
    {
      key: "trialExpiry" as const,
      label: t("notifications.trial_expiry_label"),
      description: t("notifications.trial_expiry_desc"),
    },
    {
      key: "teamInvites" as const,
      label: t("notifications.team_invites_label"),
      description: t("notifications.team_invites_desc"),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="text-primary h-5 w-5" />
          <CardTitle>
            {t("notifications.card_title")}
            {isDirty && <span className="text-destructive ml-1">*</span>}
          </CardTitle>
        </div>
        <CardDescription>{t("notifications.card_description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notificationOptions.map((option) => (
            <div
              key={option.key}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="space-y-1">
                <Label htmlFor={option.key} className="cursor-pointer text-sm font-medium">
                  {option.label}
                </Label>
                <p className="text-muted-foreground text-xs">{option.description}</p>
              </div>
              <Switch
                id={option.key}
                checked={settings[option.key]}
                onCheckedChange={() => handleToggle(option.key)}
                disabled={isSaving}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
