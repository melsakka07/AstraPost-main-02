"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type TargetType = "all" | "segment" | "individual";

interface NotificationFormData {
  title: string;
  body: string;
  targetType: TargetType;
  segment?: string;
  userIds?: string[];
  scheduledAt?: string;
}

export function NotificationEditor() {
  const t = useTranslations();

  const SEGMENTS = [
    { value: "trial_users", label: t("admin.notifications.segments.trialUsers") },
    { value: "inactive_90d", label: t("admin.notifications.segments.inactive90d") },
    { value: "paid_users", label: t("admin.notifications.segments.paidUsers") },
    { value: "free_users", label: t("admin.notifications.segments.freeUsers") },
  ];

  const [form, setForm] = useState<NotificationFormData>({
    title: "",
    body: "",
    targetType: "all",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent, schedule: boolean) => {
    e.preventDefault();

    if (!form.title.trim() || !form.body.trim()) {
      toast.error(t("admin.notifications.titleBodyRequired"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          status: schedule ? "scheduled" : "sent",
          scheduledAt: schedule ? form.scheduledAt : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t("admin.notifications.saveFailed"));
      }

      toast.success(schedule ? t("admin.notifications.scheduled") : t("admin.notifications.sent"));
      setForm({ title: "", body: "", targetType: "all" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.notifications.saveError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin.notifications.createTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t("admin.notifications.titleLabel")}</Label>
            <Input
              id="title"
              placeholder={t("admin.notifications.titlePlaceholder")}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">{t("admin.notifications.messageLabel")}</Label>
            <Textarea
              id="body"
              placeholder={t("admin.notifications.messagePlaceholder")}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={4}
            />
          </div>

          {/* Target Type */}
          <div className="space-y-2">
            <Label htmlFor="target">{t("admin.notifications.targetTypeLabel")}</Label>
            <Select
              value={form.targetType}
              onValueChange={(value) => setForm({ ...form, targetType: value as TargetType })}
            >
              <SelectTrigger id="target">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.notifications.targetType.all")}</SelectItem>
                <SelectItem value="segment">
                  {t("admin.notifications.targetType.segment")}
                </SelectItem>
                <SelectItem value="individual">
                  {t("admin.notifications.targetType.individual")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Segment Selector */}
          {form.targetType === "segment" && (
            <div className="space-y-2">
              <Label htmlFor="segment">{t("admin.notifications.selectSegmentLabel")}</Label>
              <Select
                value={form.segment || ""}
                onValueChange={(value) => setForm({ ...form, segment: value })}
              >
                <SelectTrigger id="segment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map((seg) => (
                    <SelectItem key={seg.value} value={seg.value}>
                      {seg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Individual Users */}
          {form.targetType === "individual" && (
            <div className="space-y-2">
              <Label htmlFor="users">{t("admin.notifications.userIdsLabel")}</Label>
              <Textarea
                id="users"
                placeholder={t("admin.notifications.userIdsPlaceholder")}
                rows={3}
                onChange={(e) =>
                  setForm({
                    ...form,
                    userIds: e.target.value
                      .split(",")
                      .map((id) => id.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
          )}

          {/* Schedule */}
          <div className="space-y-2">
            <Label htmlFor="schedule">{t("admin.notifications.scheduleLabel")}</Label>
            <Input
              id="schedule"
              type="datetime-local"
              value={form.scheduledAt || ""}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={(e) => handleSubmit(e, false)} disabled={loading} className="flex-1">
              {loading ? t("admin.notifications.sending") : t("admin.notifications.sendNow")}
            </Button>
            <Button
              variant="outline"
              onClick={(e) => handleSubmit(e, true)}
              disabled={loading || !form.scheduledAt}
              className="flex-1"
            >
              {loading
                ? t("admin.notifications.scheduling")
                : t("admin.notifications.scheduleButton")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
