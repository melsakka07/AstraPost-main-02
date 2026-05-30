"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  text: z.string().max(500),
  type: z.enum(["info", "warning", "success"]),
  enabled: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface AnnouncementFormProps {
  initialData?: { text: string; type: "info" | "warning" | "success"; enabled: boolean };
}

export function AnnouncementForm({ initialData }: AnnouncementFormProps) {
  const t = useTranslations();

  const TYPE_LABELS: Record<string, string> = {
    info: t("admin.announcement.typeInfo"),
    warning: t("admin.announcement.typeWarning"),
    success: t("admin.announcement.typeSuccess"),
  };

  const form = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialData ?? { text: "", type: "info", enabled: false },
  });

  // Fallback fetch when used without SSR initialData (keeps component self-contained)
  useEffect(() => {
    if (initialData) return;
    fetch("/api/admin/announcement")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          form.reset({
            text: json.data.text ?? "",
            type: json.data.type ?? "info",
            enabled: json.data.enabled ?? false,
          });
        }
      })
      .catch(() => {});
  }, [form, initialData]);

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await fetch("/api/admin/announcement", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(error);
      }
      toast.success(t("admin.announcement.saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("admin.announcement.saveError"));
    }
  };

  const text = form.watch("text");
  const type = form.watch("type");
  const enabled = form.watch("enabled");

  const previewBg =
    type === "warning"
      ? "bg-warning-3 border-warning-6/30 text-warning-11"
      : type === "success"
        ? "bg-success-3 border-success-6/30 text-success-11"
        : "bg-info-3 border-info-6/30 text-info-11";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.announcement.bannerPreview")}</CardTitle>
          <CardDescription>{t("admin.announcement.bannerPreviewDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {text && enabled ? (
            <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${previewBg}`}>
              {text}
            </div>
          ) : (
            <div className="text-muted-foreground flex h-12 items-center justify-center rounded-lg border border-dashed text-sm">
              {!text
                ? t("admin.announcement.enterTextToPreview")
                : t("admin.announcement.toggleToShow")}
            </div>
          )}
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="text"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("admin.announcement.textLabel")}</FormLabel>
                <FormDescription>{t("admin.announcement.textDesc")}</FormDescription>
                <FormControl>
                  <Textarea
                    placeholder={t("admin.announcement.textPlaceholder")}
                    rows={3}
                    aria-label={t("admin.announcement.textAriaLabel")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.announcement.typeLabel")}</FormLabel>
                  <FormDescription>{t("admin.announcement.typeDesc")}</FormDescription>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger aria-label="Select announcement type">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(TYPE_LABELS) as Array<keyof typeof TYPE_LABELS>).map((key) => (
                        <SelectItem key={key} value={key}>
                          {TYPE_LABELS[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-col justify-end">
                  <FormLabel>{t("admin.announcement.activeLabel")}</FormLabel>
                  <FormDescription>{t("admin.announcement.activeDesc")}</FormDescription>
                  <div className="flex h-10 items-center gap-3">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label={t("admin.announcement.toggleAnnouncementAria")}
                      />
                    </FormControl>
                    <span className="text-muted-foreground text-sm">
                      {field.value
                        ? t("admin.announcement.visibleToAll")
                        : t("admin.announcement.hidden")}
                    </span>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? t("admin.common.saving")
                : t("admin.announcement.saveButton")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
