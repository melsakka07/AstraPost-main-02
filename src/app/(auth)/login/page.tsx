import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Check } from "lucide-react"
import { SignInButton } from "@/components/auth/sign-in-button"
import { auth } from "@/lib/auth"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_description?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (session) {
    redirect("/dashboard")
  }

  const { error, error_description } = await searchParams

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Sign in with X to get started
          </h1>
          <p className="text-sm text-muted-foreground">
            Connect your X account to manage, schedule, and analyze your content.
          </p>
        </div>

        <div className="space-y-3">
          {FEATURES.map((feature) => (
            <div key={feature} className="flex items-center gap-3 text-sm text-muted-foreground">
              <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <SignInButton />

        {error && (
          <p role="alert" className="text-sm text-center text-destructive">
            {getErrorMessage(error, error_description)}
          </p>
        )}

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to AstraPost&apos;s{" "}
          <a href="/legal/terms" className="underline hover:text-foreground">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/legal/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  )
}

const FEATURES = [
  "Schedule tweets and threads in advance",
  "AI-powered thread writer in your language",
  "Viral content analyzer and analytics dashboard",
]

function getErrorMessage(error: string, description?: string): string {
  switch (error) {
    case "access_denied":
      return "You need to authorize AstraPost to access your X account to continue."
    case "server_error":
      return "X is currently unavailable. Please try again in a few minutes."
    case "callback_error":
      return "Sign-in failed. Please try again."
    case "email_not_found":
      return "We couldn't get your email from X. Please ensure your X account has a verified email address."
    default:
      return description || "Sign-in failed. Please try again."
  }
}
