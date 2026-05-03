import { Building2, Cpu, Headset, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Enterprise plan teaser card shown on the /pricing page.
 * Server component — uses server-side i18n and a mailto link.
 */
export async function EnterpriseCard() {
  const t = await getTranslations("pricing");

  const enterpriseFeatures = [
    { icon: Headset, key: "enterprise_feature_1" },
    { icon: Cpu, key: "enterprise_feature_2" },
    { icon: Building2, key: "enterprise_feature_3" },
    { icon: ShieldCheck, key: "enterprise_feature_4" },
  ] as const;

  return (
    <div className="mx-auto max-w-5xl">
      <Card className="border-primary/30 from-primary/5 via-background to-background bg-gradient-to-br">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight md:text-3xl">
            {t("enterprise_title")}
          </CardTitle>
          <CardDescription className="text-muted-foreground text-lg">
            {t("enterprise_description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            {enterpriseFeatures.map(({ icon: Icon, key }) => (
              <div
                key={key}
                className="border-border/50 flex flex-col items-center gap-2 rounded-lg border p-4 text-center"
              >
                <Icon className="text-primary h-8 w-8" />
                <span className="text-sm font-medium">{t(key)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center">
            <Button size="lg" asChild>
              <a href="mailto:sales@astrapost.com">{t("enterprise_contact")}</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
