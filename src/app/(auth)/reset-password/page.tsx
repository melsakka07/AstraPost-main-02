"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const t = useTranslations("auth");

  const validateToken = useCallback(
    async (tokenParam: string) => {
      try {
        const res = await fetch("/api/auth/password-reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenParam, action: "validate" }),
        });

        if (!res.ok) {
          const error = await res.json();
          toast.error(error.message || t("reset_password.errors.invalid_token"));
          setIsTokenValid(false);
        } else {
          setIsTokenValid(true);
        }
      } catch (err) {
        toast.error(t("reset_password.errors.invalid_token"));
        setIsTokenValid(false);
      } finally {
        setIsValidating(false);
      }
    },
    [t]
  );

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      toast.error(t("reset_password.errors.invalid_token"));
      setIsValidating(false);
      return;
    }

    setToken(tokenParam);
    validateToken(tokenParam);
  }, [searchParams, validateToken, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error(t("reset_password.errors.weak_password"));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t("reset_password.errors.password_mismatch"));
      return;
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      toast.error(t("reset_password.errors.weak_password"));
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, action: "reset" }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.message || t("reset_password.errors.invalid_token"));
        return;
      }

      toast.success(t("reset_password.title"));
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      toast.error(t("reset_password.errors.invalid_token"));
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isTokenValid) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{t("reset_password.invalid_link_title")}</h1>
            <p className="text-muted-foreground">{t("reset_password.invalid_link_body")}</p>
          </div>
          <Button onClick={() => router.push("/forgot-password")} className="w-full">
            {t("reset_password.request_new")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">{t("reset_password.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("reset_password.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium">
              {t("reset_password.new_password_label")}
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-muted-foreground text-xs">
              {t("reset_password.password_requirements")}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm" className="block text-sm font-medium">
              {t("reset_password.confirm_password_label")}
            </label>
            <Input
              id="confirm"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("reset_password.submit")}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          {t("reset_password.remember")}{" "}
          <a href="/login" className="text-primary hover:text-primary/80 font-medium">
            {t("reset_password.sign_in_link")}
          </a>
        </p>
      </div>
    </div>
  );
}
