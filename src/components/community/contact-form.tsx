"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Send } from "lucide-react";
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

const CATEGORIES = [
  { value: "general", label: "General Question" },
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "partnership", label: "Partnership / Business" },
  { value: "billing", label: "Billing & Plans" },
] as const;

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).trim(),
  email: z.string().email("Invalid email address").max(254).toLowerCase().trim(),
  category: z.enum(["general", "bug", "feature", "partnership", "billing"], {
    errorMap: () => ({ message: "Please select a category" }),
  } as any),
  subject: z.string().min(5, "Subject must be at least 5 characters").max(150).trim(),
  message: z.string().min(20, "Message must be at least 20 characters").max(2000).trim(),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export function ContactForm() {
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
        setErrorMessage("Too many submissions. Please wait before trying again.");
        setFormState("error");
        return;
      }

      if (!res.ok || !data.success) {
        if (data.details) {
          Object.entries(data.details).forEach(([key, messages]) => {
            form.setError(key as keyof ContactFormValues, {
              type: "server",
              message: messages[0] || "Invalid field",
            });
          });
        }
        setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        setFormState("error");
        return;
      }

      setFormState("success");
    } catch {
      setErrorMessage("Network error. Please check your connection and try again.");
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
            <h3 className="text-xl font-semibold">Message sent!</h3>
            <p className="text-muted-foreground max-w-xs text-sm">
              We&apos;ve received your message and will reply within 1–2 business days. Check your
              inbox for a confirmation email.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setFormState("idle")}>
            Send another message
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isSubmitting = formState === "submitting";

  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Send us a message</CardTitle>
        <CardDescription>We typically respond within 1–2 business days.</CardDescription>
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
                    <FormLabel>Your name</FormLabel>
                    <FormControl>
                      <Input placeholder="Fatima Al-Rashid" disabled={isSubmitting} {...field} />
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
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
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
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category…" />
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
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Brief description of your question"
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
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us more about your question or issue…"
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
                  Sending…
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
