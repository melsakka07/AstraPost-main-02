"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const t = useTranslations("auth");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "request" }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.message || t("forgot_password.errors.send_failed"));
        return;
      }

      setSubmitted(true);
      toast.success(t("forgot_password.check_email_title"));
    } catch (err) {
      toast.error(t("forgot_password.errors.send_failed"));
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{t("forgot_password.check_email_title")}</h1>
            <p className="text-muted-foreground">
              {t.rich("forgot_password.check_email_body", {
                email: () => <strong>{email}</strong>,
              })}
            </p>
          </div>
          <Button onClick={() => router.push("/login")} className="w-full">
            {t("forgot_password.back_to_login")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">{t("forgot_password.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("forgot_password.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium">
              {t("forgot_password.email_label")}
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("forgot_password.submit")}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          {t("forgot_password.remember")}{" "}
          <a href="/login" className="text-primary hover:text-primary/80 font-medium">
            {t("forgot_password.sign_in_link")}
          </a>
        </p>
      </div>
    </div>
  );
}
