"use client";

import { useState } from "react";
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

const SEGMENTS = [
  { value: "trial_users", label: "Trial Users" },
  { value: "inactive_90d", label: "Inactive (90+ days)" },
  { value: "paid_users", label: "Paid Users" },
  { value: "free_users", label: "Free Users" },
];

export function NotificationEditor() {
  const [form, setForm] = useState<NotificationFormData>({
    title: "",
    body: "",
    targetType: "all",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent, schedule: boolean) => {
    e.preventDefault();

    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and body are required");
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
        throw new Error(error.message || "Failed to save notification");
      }

      toast.success(schedule ? "Notification scheduled" : "Notification sent");
      setForm({ title: "", body: "", targetType: "all" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error saving notification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Notification</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Notification title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              placeholder="Notification message"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={4}
            />
          </div>

          {/* Target Type */}
          <div className="space-y-2">
            <Label htmlFor="target">Target Type</Label>
            <Select
              value={form.targetType}
              onValueChange={(value) => setForm({ ...form, targetType: value as TargetType })}
            >
              <SelectTrigger id="target">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="segment">Segment</SelectItem>
                <SelectItem value="individual">Individual Users</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Segment Selector */}
          {form.targetType === "segment" && (
            <div className="space-y-2">
              <Label htmlFor="segment">Select Segment</Label>
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
              <Label htmlFor="users">Users (comma-separated IDs)</Label>
              <Textarea
                id="users"
                placeholder="user1, user2, user3..."
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
            <Label htmlFor="schedule">Schedule (optional)</Label>
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
              {loading ? "Sending..." : "Send Now"}
            </Button>
            <Button
              variant="outline"
              onClick={(e) => handleSubmit(e, true)}
              disabled={loading || !form.scheduledAt}
              className="flex-1"
            >
              {loading ? "Scheduling..." : "Schedule"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
