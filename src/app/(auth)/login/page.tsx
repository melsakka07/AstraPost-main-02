import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { SignInButton } from "@/components/auth/sign-in-button";
import { auth } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_description?: string; ref?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) {
    redirect("/dashboard");
  }

  const { error, error_description, ref } = await searchParams;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Sign in with X to get started</h1>
          <p className="text-muted-foreground text-sm">
            Connect your X account to manage, schedule, and analyze your content.
          </p>
        </div>

        <div className="space-y-3">
          {FEATURES.map((feature) => (
            <div key={feature} className="text-muted-foreground flex items-center gap-3 text-sm">
              <Check className="text-primary h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <SignInButton {...(ref !== undefined && { referralCode: ref })} />

        {error && (
          <p role="alert" className="text-destructive text-center text-sm">
            {getErrorMessage(error, error_description)}
          </p>
        )}

        <p className="text-muted-foreground text-center text-xs">
          By continuing, you agree to AstraPost&apos;s{" "}
          <a href="/legal/terms" className="hover:text-foreground underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/legal/privacy" className="hover:text-foreground underline">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}

const FEATURES = [
  "Schedule tweets and threads in advance",
  "AI-powered thread writer in your language",
  "Viral content analyzer and analytics dashboard",
];

function getErrorMessage(error: string, description?: string): string {
  switch (error) {
    case "access_denied":
      return "You need to authorize AstraPost to access your X account to continue.";
    case "server_error":
      return "X is currently unavailable. Please try again in a few minutes.";
    case "callback_error":
      return "Sign-in failed. Please try again.";
    case "email_not_found":
      return "We couldn't get your email from X. Please ensure your X account has a verified email address.";
    default:
      return description || "Sign-in failed. Please try again.";
  }
}
