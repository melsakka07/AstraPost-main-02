"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { useTranslations } from "next-intl";
import { ReschedulePostForm } from "@/components/calendar/reschedule-post-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RescheduleInlineDialogProps {
  postId: string;
  scheduledAt: Date | null;
  ariaLabel?: string;
}

function toDatetimeLocal(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  // Format: YYYY-MM-DDTHH:mm  (datetime-local value)
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RescheduleInlineDialog({
  postId,
  scheduledAt,
  ariaLabel,
}: RescheduleInlineDialogProps) {
  const t = useTranslations("queue");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={ariaLabel ?? "Reschedule post"}
          className="text-muted-foreground hover:text-foreground"
        >
          <CalendarClock className="mr-1 h-4 w-4" />
          {t("reschedule")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reschedule Post</DialogTitle>
          <DialogDescription>Pick a new date and time to publish this post.</DialogDescription>
        </DialogHeader>
        <ReschedulePostForm postId={postId} initialDate={toDatetimeLocal(scheduledAt)} />
      </DialogContent>
    </Dialog>
  );
}
