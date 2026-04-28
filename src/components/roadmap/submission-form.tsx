"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lightbulb } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface SubmissionFormProps {
  isLoggedIn: boolean;
}

export function SubmissionForm({ isLoggedIn }: SubmissionFormProps) {
  const t = useTranslations("roadmap");

  const formSchema = z.object({
    title: z.string().min(5, t("submit_validation_title_min")).max(100).trim(),
    category: z.enum(["feature", "improvement", "bug", "other"], {
      errorMap: () => ({ message: t("submit_validation_category") }),
    } as any),
    description: z.string().min(20, t("submit_validation_description_min")).max(2000).trim(),
  });

  type FormValues = z.infer<typeof formSchema>;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "feature" as const,
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!isLoggedIn) {
      toast.error(t("submit_toast_auth_required"));
      window.location.href = "/login";
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || t("submit_toast_error_submit"));
        return;
      }

      toast.success(t("submit_toast_success"));
      form.reset();
      setShowSuccess(true);
    } catch (error) {
      toast.error(t("submit_toast_error_generic"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="border-border/50 from-muted/50 to-muted/20 rounded-2xl border bg-gradient-to-br p-8 text-center">
        <div className="mx-auto max-w-md space-y-4">
          <h3 className="text-xl font-semibold">{t("submit_auth_title")}</h3>
          <p className="text-muted-foreground">{t("submit_auth_message")}</p>
          <Button asChild className="w-full">
            <a href="/login">{t("submit_auth_button")}</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-border/50 from-muted/50 to-muted/20 rounded-2xl border bg-gradient-to-br p-8">
      {showSuccess ? (
        <div className="space-y-4 py-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Lightbulb className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold">{t("submit_success_title")}</h3>
          <p className="text-muted-foreground mx-auto max-w-md">{t("submit_success_message")}</p>
          <Button variant="outline" onClick={() => setShowSuccess(false)}>
            {t("submit_success_another")}
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t("submit_title")}</h3>
              <p className="text-muted-foreground text-sm">{t("submit_subtitle")}</p>
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("submit_label_title")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("submit_placeholder_title")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("submit_label_description")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("submit_placeholder_description")}
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("submit_label_category")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("submit_placeholder_category")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="feature">{t("submit_category_feature")}</SelectItem>
                      <SelectItem value="improvement">
                        {t("submit_category_improvement")}
                      </SelectItem>
                      <SelectItem value="bug">{t("submit_category_bug")}</SelectItem>
                      <SelectItem value="other">{t("submit_category_other")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t("submit_button_submitting") : t("submit_button")}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
