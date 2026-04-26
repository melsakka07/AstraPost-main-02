"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("auth");

  const registerSchema = z
    .object({
      email: z.string().email(t("register.errors.invalid_email")),
      password: z
        .string()
        .min(8, t("register.errors.password_min"))
        .max(128, t("register.errors.password_max")),
      confirmPassword: z.string(),
      terms: z.boolean().refine((val) => val === true, {
        message: t("register.errors.terms_required"),
      }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("register.errors.password_mismatch"),
      path: ["confirmPassword"],
    });

  type RegisterFormValues = z.infer<typeof registerSchema>;

  const features = [
    t("register.features.schedule"),
    t("register.features.ai_writer"),
    t("register.features.viral"),
  ];

  // Store referral code in cookie when component mounts
  useEffect(() => {
    if (ref) {
      const isSecure = window.location.protocol === "https:";
      document.cookie = `astrapost_ref=${encodeURIComponent(
        ref
      )};path=/;max-age=604800;SameSite=Lax${isSecure ? ";Secure" : ""}`;
    }
  }, [ref]);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setIsPending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError(t("register.errors.email_exists"));
        } else if (response.status === 429) {
          setError(data.error || t("register.errors.weak_password"));
        } else {
          setError(data.error || t("register.errors.weak_password"));
        }
        setIsPending(false);
        return;
      }

      // Success - redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError(t("register.errors.weak_password"));
      setIsPending(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{t("register.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("register.subtitle")}</p>
        </div>

        <div className="space-y-3">
          {features.map((feature) => (
            <div key={feature} className="text-muted-foreground flex items-center gap-3 text-sm">
              <Check className="text-primary h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("register.email_label")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("register.email_placeholder")}
                      type="email"
                      autoCapitalize="none"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("register.password_label")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("register.password_placeholder")}
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("register.confirm_password_label")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("register.confirm_password_placeholder")}
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                  <FormControl>
                    <Checkbox checked={field.value as boolean} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {t.rich("register.agreement", {
                        terms: (chunks) => (
                          <a href="/legal/terms" className="hover:text-foreground underline">
                            {chunks}
                          </a>
                        ),
                        privacy: (chunks) => (
                          <a href="/legal/privacy" className="hover:text-foreground underline">
                            {chunks}
                          </a>
                        ),
                      })}
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {error && (
              <p role="alert" className="text-destructive text-center text-sm">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  {t("register.creating")}
                </>
              ) : (
                t("register.submit")
              )}
            </Button>
          </form>
        </Form>

        <p className="text-muted-foreground text-center text-sm">
          {t("register.has_account")}{" "}
          <a href="/login" className="text-primary hover:text-primary/80 font-medium">
            {t("register.sign_in_link")}
          </a>
        </p>
      </div>
    </div>
  );
}
