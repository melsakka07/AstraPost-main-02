"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type FormState = "idle" | "submitting" | "success" | "error";

const CATEGORIES = [
  { value: "general", label: "General Question" },
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "partnership", label: "Partnership / Business" },
  { value: "billing", label: "Billing & Plans" },
] as const;

interface FieldErrors {
  name?: string[];
  email?: string[];
  category?: string[];
  subject?: string[];
  message?: string[];
}

export function ContactForm() {
  const [formState, setFormState] = useState<FormState>("idle");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState("submitting");
    setFieldErrors({});
    setErrorMessage(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name") as string,
      email: fd.get("email") as string,
      category,
      subject: fd.get("subject") as string,
      message: fd.get("message") as string,
    };

    try {
      const res = await fetch("/api/community/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        details?: FieldErrors;
      };

      if (res.status === 429) {
        setErrorMessage("Too many submissions. Please wait before trying again.");
        setFormState("error");
        return;
      }

      if (!res.ok || !data.success) {
        if (data.details) setFieldErrors(data.details);
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
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Name + Email row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Your name</Label>
              <Input
                id="contact-name"
                name="name"
                placeholder="Fatima Al-Rashid"
                required
                minLength={2}
                maxLength={100}
                disabled={isSubmitting}
                aria-describedby={fieldErrors.name ? "contact-name-error" : undefined}
                aria-invalid={!!fieldErrors.name}
              />
              {fieldErrors.name && (
                <p id="contact-name-error" role="alert" className="text-destructive text-xs">
                  {fieldErrors.name[0]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email address</Label>
              <Input
                id="contact-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                maxLength={254}
                disabled={isSubmitting}
                aria-describedby={fieldErrors.email ? "contact-email-error" : undefined}
                aria-invalid={!!fieldErrors.email}
              />
              {fieldErrors.email && (
                <p id="contact-email-error" role="alert" className="text-destructive text-xs">
                  {fieldErrors.email[0]}
                </p>
              )}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="contact-category">Category</Label>
            <Select required value={category} onValueChange={setCategory} disabled={isSubmitting}>
              <SelectTrigger
                id="contact-category"
                aria-describedby={fieldErrors.category ? "contact-category-error" : undefined}
                aria-invalid={!!fieldErrors.category}
              >
                <SelectValue placeholder="Select a category…" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.category && (
              <p id="contact-category-error" role="alert" className="text-destructive text-xs">
                {fieldErrors.category[0]}
              </p>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="contact-subject">Subject</Label>
            <Input
              id="contact-subject"
              name="subject"
              placeholder="Brief description of your question"
              required
              minLength={5}
              maxLength={150}
              disabled={isSubmitting}
              aria-describedby={fieldErrors.subject ? "contact-subject-error" : undefined}
              aria-invalid={!!fieldErrors.subject}
            />
            {fieldErrors.subject && (
              <p id="contact-subject-error" role="alert" className="text-destructive text-xs">
                {fieldErrors.subject[0]}
              </p>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="contact-message">Message</Label>
            <Textarea
              id="contact-message"
              name="message"
              placeholder="Tell us more about your question or issue…"
              required
              minLength={20}
              maxLength={2000}
              rows={5}
              disabled={isSubmitting}
              aria-describedby={fieldErrors.message ? "contact-message-error" : undefined}
              aria-invalid={!!fieldErrors.message}
              className="resize-none"
            />
            {fieldErrors.message && (
              <p id="contact-message-error" role="alert" className="text-destructive text-xs">
                {fieldErrors.message[0]}
              </p>
            )}
          </div>

          {/* Global error */}
          {errorMessage && (
            <p role="alert" aria-live="polite" className="text-destructive text-sm">
              {errorMessage}
            </p>
          )}

          <Button type="submit" className="group w-full" disabled={isSubmitting || !category}>
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
      </CardContent>
    </Card>
  );
}
