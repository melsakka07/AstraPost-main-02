"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lightbulb } from "lucide-react";
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

const feedbackSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be 100 characters or fewer"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(2000, "Description must be 2000 characters or fewer"),
  category: z.enum(["feature", "bug", "other"]),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

interface SubmissionFormProps {
  isLoggedIn: boolean;
}

export function SubmissionForm({ isLoggedIn }: SubmissionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "feature" as const,
    },
  });

  const onSubmit = async (data: FeedbackFormValues) => {
    if (!isLoggedIn) {
      toast.error("Please sign in to submit feedback");
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
        toast.error(result.error || "Failed to submit feedback");
        return;
      }

      toast.success(
        "Thank you for your feedback! Our development team will review your submission."
      );
      form.reset();
      setShowSuccess(true);
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="border-border/50 from-muted/50 to-muted/20 rounded-2xl border bg-gradient-to-br p-8 text-center">
        <div className="mx-auto max-w-md space-y-4">
          <h3 className="text-xl font-semibold">Sign in to Submit Feedback</h3>
          <p className="text-muted-foreground">
            Please sign in to share your ideas and help us improve AstraPost.
          </p>
          <Button asChild className="w-full">
            <a href="/login">Sign In</a>
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
          <h3 className="text-xl font-semibold">Thank You!</h3>
          <p className="text-muted-foreground mx-auto max-w-md">
            Your feedback has been submitted successfully. Our development team will review your
            submission and get back to you if needed.
          </p>
          <Button variant="outline" onClick={() => setShowSuccess(false)}>
            Submit Another Idea
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Share Your Ideas</h3>
              <p className="text-muted-foreground text-sm">
                Help us build the features you need. Submit your ideas and suggestions below.
              </p>
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief summary of your idea" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your idea in detail..."
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
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="bug">Bug Report</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
