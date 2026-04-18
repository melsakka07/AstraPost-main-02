"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";
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

  const validateToken = useCallback(async (tokenParam: string) => {
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenParam, action: "validate" }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.message || "Invalid or expired reset link");
        setIsTokenValid(false);
      } else {
        setIsTokenValid(true);
      }
    } catch (err) {
      toast.error("Failed to validate reset link");
      setIsTokenValid(false);
    } finally {
      setIsValidating(false);
    }
  }, []);

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      toast.error("No reset token found. Please request a new password reset link.");
      setIsValidating(false);
      return;
    }

    setToken(tokenParam);
    validateToken(tokenParam);
  }, [searchParams, validateToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      toast.error("Password must contain uppercase, lowercase, and numbers");
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
        toast.error(error.message || "Failed to reset password");
        return;
      }

      toast.success("Password reset successfully. Redirecting to login...");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
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
            <h1 className="text-2xl font-bold">Invalid link</h1>
            <p className="text-muted-foreground">This password reset link is invalid or expired.</p>
          </div>
          <Button onClick={() => router.push("/forgot-password")} className="w-full">
            Request new link
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Create new password</h1>
          <p className="text-muted-foreground text-sm">
            Enter a strong password to secure your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium">
              New Password
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
              At least 8 characters with uppercase, lowercase, and numbers
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm" className="block text-sm font-medium">
              Confirm Password
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
            Reset password
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          Remember your password?{" "}
          <a href="/login" className="text-primary hover:text-primary/80 font-medium">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
