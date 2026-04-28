"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function JoinTeamContent() {
  const t = useTranslations("teams");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error(t("invalid_invite"));
      router.push("/dashboard");
    }
  }, [token, router, t]);

  async function handleJoin() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/team/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || result.message || t("failed_to_join"));
      }

      toast.success(t("joined_success"));
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("something_wrong"));
    } finally {
      setIsLoading(false);
    }
  }

  if (!token) return null;

  return (
    <Card className="mx-auto mt-20 w-full max-w-md">
      <CardHeader className="text-center">
        <div className="bg-primary/10 mx-auto mb-4 w-fit rounded-full p-3">
          <Users className="text-primary h-8 w-8" />
        </div>
        <CardTitle className="text-2xl">{t("join_title")}</CardTitle>
        <CardDescription>{t("join_description")}</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-center">{t("join_body")}</CardContent>
      <CardFooter>
        <Button className="w-full" size="lg" onClick={handleJoin} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("accept_invite")}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function JoinTeamPage() {
  const t = useTranslations("teams");
  return (
    <div className="container flex h-dvh w-screen flex-col items-center justify-center">
      <Suspense
        fallback={
          <div role="status" aria-label={t("loading_page")}>
            <Loader2 className="text-primary h-8 w-8 animate-spin" aria-hidden="true" />
            <span className="sr-only">{t("loading")}</span>
          </div>
        }
      >
        <JoinTeamContent />
      </Suspense>
    </div>
  );
}
