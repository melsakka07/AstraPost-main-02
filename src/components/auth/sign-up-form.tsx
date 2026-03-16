"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signUp, signIn } from "@/lib/auth-client"

export function SignUpForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [referralCode, setReferralCode] = useState("")
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setIsPending(true)

    // Validate referral code first if present
    let referrerId: string | null = null;
    if (referralCode.trim()) {
      try {
        const res = await fetch("/api/referral/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: referralCode.trim() })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Invalid referral code");
          setIsPending(false);
          return;
        }
        referrerId = data.referrerId;
      } catch (err) {
        setError("Error validating referral code");
        setIsPending(false);
        return;
      }
    }

    try {
      const result = await signUp.email({
        name,
        email,
        password,
        callbackURL: "/dashboard",
      })

      if (result.error) {
        setError(result.error.message || "Failed to create account")
      } else {
        if (referrerId) {
          try {
            await fetch("/api/user/set-referrer", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ referrerId })
            });
          } catch (err) {
            // Ignore error, non-blocking
            console.error("Failed to set referrer", err);
          }
        }
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Create a password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="referralCode">Referral Code (Optional)</Label>
        <Input
          id="referralCode"
          type="text"
          placeholder="Enter referral code"
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value)}
          disabled={isPending}
        />
      </div>
      {error && (
        <p role="alert" aria-live="polite" className="text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creating account..." : "Create account"}
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <div className="w-full">
      <Button 
        variant="outline" 
        className="w-full" 
        type="button"
        onClick={async () => {
          setIsPending(true);
          try {
            await signIn.social({ 
              provider: "twitter", 
              callbackURL: "/dashboard" 
            });
          } catch (err) {
            setError("Failed to sign up with X");
          } finally {
            setIsPending(false);
          }
        }}
        disabled={isPending}
      >
        <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        X
      </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </form>
  )
}
