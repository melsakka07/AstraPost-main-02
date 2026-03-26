"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
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

const TYPE_LABELS = { info: "Info (blue)", warning: "Warning (amber)", success: "Success (green)" };

export function AnnouncementForm() {
  const form = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { text: "", type: "info", enabled: false },
  });

  useEffect(() => {
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
  }, [form]);

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
      toast.success("Announcement saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save announcement");
    }
  };

  const text = form.watch("text");
  const type = form.watch("type");
  const enabled = form.watch("enabled");

  const previewBg =
    type === "warning"
      ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
      : type === "success"
      ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400"
      : "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Banner preview</CardTitle>
          <CardDescription>How it will appear to users at the top of their dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          {text && enabled ? (
            <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${previewBg}`}>
              {text}
            </div>
          ) : (
            <div className="flex h-12 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              {!text ? "Enter text below to preview" : "Toggle active to show preview"}
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
                <FormLabel>Announcement text</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g. We're performing scheduled maintenance on Saturday…"
                    rows={3}
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
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(TYPE_LABELS) as Array<keyof typeof TYPE_LABELS>).map((key) => (
                        <SelectItem key={key} value={key}>{TYPE_LABELS[key]}</SelectItem>
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
                  <FormLabel>Active</FormLabel>
                  <div className="flex h-10 items-center gap-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <span className="text-sm text-muted-foreground">
                      {field.value ? "Visible to all users" : "Hidden"}
                    </span>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Save announcement"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
