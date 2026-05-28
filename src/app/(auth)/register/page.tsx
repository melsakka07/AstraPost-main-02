"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { SignInButton } from "@/components/auth/sign-in-button";
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
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const t = useTranslations("auth");

  const registerSchema = z
    .object({
      name: z.string().min(1, t("register.errors.name_required")),
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
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  const passwordValue = form.watch("password");

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
          name: values.name,
          email: values.email,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError(data.error || t("register.errors.email_exists"));
        } else if (response.status === 400) {
          setError(data.error || t("register.errors.weak_password"));
        } else if (response.status === 429) {
          setError(data.error || t("register.errors.rate_limited"));
        } else if (response.status >= 500) {
          setError(t("register.errors.server_error"));
        } else {
          setError(data.error || t("register.errors.weak_password"));
        }
        setIsPending(false);
        return;
      }

      // Success - redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError(t("register.errors.network_error"));
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

        <div className="space-y-4">
          <SignInButton {...(ref != null && { referralCode: ref })} variant="outline">
            {t("register.continue_with_x")}
          </SignInButton>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="border-border w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background text-muted-foreground px-2">
                {t("register.or_divider")}
              </span>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("register.name_label")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("register.name_placeholder")}
                      autoCapitalize="words"
                      autoComplete="name"
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
                    <div className="relative">
                      <Input
                        placeholder={t("register.password_placeholder")}
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className="pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-muted-foreground hover:text-foreground absolute end-3 top-1/2 -translate-y-1/2"
                        aria-label={
                          showPassword
                            ? t("register.password.hide_password")
                            : t("register.password.show_password")
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(() => {
              let filledBars = 0;
              let strengthKey: string = "register.password.strength_empty";
              let barColor = "bg-destructive";

              if (passwordValue && passwordValue.length > 0) {
                if (passwordValue.length < 8) {
                  filledBars = 1;
                  strengthKey = "register.password.strength_weak";
                  barColor = "bg-destructive";
                } else if (passwordValue.length < 12) {
                  filledBars = 2;
                  strengthKey = "register.password.strength_okay";
                  barColor = "bg-warning";
                } else if (passwordValue.length < 16) {
                  filledBars = 3;
                  strengthKey = "register.password.strength_strong";
                  barColor = "bg-success-8";
                } else {
                  const hasUpper = /[A-Z]/.test(passwordValue);
                  const hasLower = /[a-z]/.test(passwordValue);
                  const hasDigit = /[0-9]/.test(passwordValue);
                  const hasSpecial = /[^A-Za-z0-9]/.test(passwordValue);
                  if (hasUpper && hasLower && hasDigit && hasSpecial) {
                    filledBars = 4;
                    strengthKey = "register.password.strength_great";
                    barColor = "bg-success";
                  } else {
                    filledBars = 3;
                    strengthKey = "register.password.strength_strong";
                    barColor = "bg-success-8";
                  }
                }
              }

              return (
                <div className="mt-2 space-y-1" aria-label={t("register.password.strength_label")}>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1.5 flex-1 rounded-full",
                          i < filledBars ? barColor : "bg-border"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-muted-foreground text-xs">{t(strengthKey)}</p>
                </div>
              );
            })()}

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => {
                const confirmValue = field.value as string;
                const isMatch = confirmValue.length > 0 && confirmValue === passwordValue;
                const isMismatch = confirmValue.length > 0 && confirmValue !== passwordValue;
                return (
                  <FormItem>
                    <FormLabel>{t("register.confirm_password_label")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder={t("register.confirm_password_placeholder")}
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          className="pr-10"
                          {...field}
                          onBlur={() => {
                            field.onBlur();
                            if (form.getValues("confirmPassword")) {
                              form.trigger("confirmPassword");
                            }
                          }}
                        />
                        {isMatch && (
                          <Check
                            className="text-success absolute end-9 top-1/2 h-4 w-4 -translate-y-1/2"
                            aria-label={t("register.password.match_yes")}
                          />
                        )}
                        {isMismatch && (
                          <X
                            className="text-destructive absolute end-9 top-1/2 h-4 w-4 -translate-y-1/2"
                            aria-label={t("register.password.match_no")}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="text-muted-foreground hover:text-foreground absolute end-3 top-1/2 -translate-y-1/2"
                          aria-label={
                            showConfirmPassword
                              ? t("register.password.hide_password")
                              : t("register.password.show_password")
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-y-0 space-x-3 rtl:space-x-reverse">
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
                    className="me-2 h-4 w-4 animate-spin"
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
