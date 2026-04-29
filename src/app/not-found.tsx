import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("errors");
  const tNav = await getTranslations("nav");

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <FileQuestion className="text-muted-foreground h-16 w-16" />
        </div>
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <h2 className="mb-4 text-xl font-semibold">{t("page_not_found")}</h2>
        <p className="text-muted-foreground mb-6">{t("page_not_found_description")}</p>
        <div className="flex justify-center gap-4">
          <Button asChild>
            <Link href="/">{t("go_home")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">{tNav("dashboard")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
