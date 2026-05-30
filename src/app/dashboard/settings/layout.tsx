import { User, CreditCard, Bell, Users, Zap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SettingsTabBar } from "@/components/settings/settings-tab-bar";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("settings");

  const tabs = [
    { label: t("nav.profile"), href: "/dashboard/settings/profile", icon: User },
    { label: t("nav.subscription"), href: "/dashboard/settings/billing", icon: CreditCard },
    { label: t("nav.notifications"), href: "/dashboard/settings/notifications", icon: Bell },
    { label: t("nav.team"), href: "/dashboard/settings/team", icon: Users },
    { label: t("nav.accounts"), href: "/dashboard/settings/integrations", icon: Zap },
  ];

  return (
    <div className="space-y-6">
      <SettingsTabBar tabs={tabs} />
      {children}
    </div>
  );
}
