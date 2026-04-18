"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
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
      toast.success("Notifications updated");
    } catch (e) {
      setSettings(settings); // Revert on error
      toast.error("Failed to update notifications");
    } finally {
      setIsSaving(false);
    }
  };

  const notificationOptions = [
    {
      key: "postFailures" as const,
      label: "Post failure alerts",
      description: "Notify me when a post fails to publish",
    },
    {
      key: "aiQuotaWarning" as const,
      label: "AI quota warning",
      description: "Notify me when I reach 80% of my AI generation quota",
    },
    {
      key: "trialExpiry" as const,
      label: "Trial expiry reminder",
      description: "Notify me 3 days before my trial expires",
    },
    {
      key: "teamInvites" as const,
      label: "Team invite notifications",
      description: "Notify me when I'm invited to join a team",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="text-primary h-5 w-5" />
          <CardTitle>
            Notifications
            {isDirty && <span className="text-destructive ml-1">*</span>}
          </CardTitle>
        </div>
        <CardDescription>Control when you receive alerts and notifications</CardDescription>
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
