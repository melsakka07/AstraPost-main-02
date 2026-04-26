import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
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
  const t = await getTranslations("auth");

  const features = [
    t("login.features.schedule"),
    t("login.features.ai_writer"),
    t("login.features.viral"),
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{t("login.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("login.subtitle")}</p>
        </div>

        <div className="space-y-3">
          {features.map((feature) => (
            <div key={feature} className="text-muted-foreground flex items-center gap-3 text-sm">
              <Check className="text-primary h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <SignInButton {...(ref !== undefined && { referralCode: ref })} />

        {error && (
          <p role="alert" className="text-destructive text-center text-sm">
            {getErrorMessage(error, error_description, t)}
          </p>
        )}

        <p className="text-muted-foreground text-center text-xs">
          {t.rich("login.agreement", {
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
        </p>

        <p className="text-muted-foreground text-center text-sm">
          {t("login.no_account")}{" "}
          <a href="/register" className="text-primary hover:text-primary/80 font-medium">
            {t("login.register_link")}
          </a>
        </p>
      </div>
    </div>
  );
}

type TFunction = Awaited<ReturnType<typeof getTranslations<"auth">>>;

function getErrorMessage(error: string, description: string | undefined, t: TFunction): string {
  const knownErrors = [
    "access_denied",
    "server_error",
    "callback_error",
    "email_not_found",
  ] as const;
  const isKnown = (knownErrors as readonly string[]).includes(error);
  if (isKnown) return t(`login.errors.${error}` as Parameters<TFunction>[0]);
  return description || t("login.errors.default");
}
