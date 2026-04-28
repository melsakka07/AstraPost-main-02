"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type FormState = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const t = useTranslations("community");

  const CATEGORIES = [
    { value: "general", label: t("contact_category_general") },
    { value: "bug", label: t("contact_category_bug") },
    { value: "feature", label: t("contact_category_feature") },
    { value: "partnership", label: t("contact_category_partnership") },
    { value: "billing", label: t("contact_category_billing") },
  ] as const;

  const contactFormSchema = z.object({
    name: z.string().min(2, t("contact_validation_name_min")).max(100).trim(),
    email: z.string().email(t("contact_validation_email")).max(254).toLowerCase().trim(),
    category: z.enum(["general", "bug", "feature", "partnership", "billing"], {
      errorMap: () => ({ message: t("contact_validation_category") }),
    } as any),
    subject: z.string().min(5, t("contact_validation_subject_min")).max(150).trim(),
    message: z.string().min(20, t("contact_validation_message_min")).max(2000).trim(),
  });

  type ContactFormValues = z.infer<typeof contactFormSchema>;

  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      category: undefined as unknown as "general", // bypass undefined default error
      subject: "",
      message: "",
    },
  });

  async function onSubmit(values: ContactFormValues) {
    setFormState("submitting");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/community/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        details?: Record<string, string[]>;
      };

      if (res.status === 429) {
        setErrorMessage(t("contact_error_too_many"));
        setFormState("error");
        return;
      }

      if (!res.ok || !data.success) {
        if (data.details) {
          Object.entries(data.details).forEach(([key, messages]) => {
            form.setError(key as keyof ContactFormValues, {
              type: "server",
              message: messages[0] || t("contact_error_invalid_field"),
            });
          });
        }
        setErrorMessage(data.error ?? t("contact_error_generic"));
        setFormState("error");
        return;
      }

      setFormState("success");
    } catch {
      setErrorMessage(t("contact_error_network"));
      setFormState("error");
    }
  }

  if (formState === "success") {
    return (
      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 pt-12 pb-12 text-center">
          <div className="bg-success/10 flex h-14 w-14 items-center justify-center rounded-full">
            <CheckCircle2 className="text-success h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">{t("contact_success_title")}</h3>
            <p className="text-muted-foreground max-w-xs text-sm">{t("contact_success_message")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setFormState("idle")}>
            {t("contact_success_button")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isSubmitting = formState === "submitting";

  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">{t("contact_form_title")}</CardTitle>
        <CardDescription>{t("contact_form_desc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Name + Email row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("contact_label_name")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("contact_placeholder_name")}
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("contact_label_email")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t("contact_placeholder_email")}
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contact_label_category")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("contact_placeholder_category")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Subject */}
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contact_label_subject")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("contact_placeholder_subject")}
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Message */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contact_label_message")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("contact_placeholder_message")}
                      rows={5}
                      disabled={isSubmitting}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Global error */}
            {errorMessage && (
              <p role="alert" aria-live="polite" className="text-destructive text-sm">
                {errorMessage}
              </p>
            )}

            <Button type="submit" className="group w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("contact_button_sending")}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  {t("contact_button_submit")}
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
