"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "@/lib/auth-client";

export function SignOutButton() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const t = useTranslations("auth");

  if (isPending) {
    return <Button disabled>{t("loading")}</Button>;
  }

  if (!session) {
    return null;
  }

  return (
    <Button
      variant="outline"
      onClick={async () => {
        await signOut();
        router.replace("/");
        router.refresh();
      }}
    >
      {t("sign_out")}
    </Button>
  );
}
