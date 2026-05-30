import { getTranslations } from "next-intl/server";
import { SettingsTabBar } from "@/components/settings/settings-tab-bar";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("settings");

  const tabs = [
    { label: t("nav.profile"), href: "/dashboard/settings/profile", icon: "profile" as const },
    {
      label: t("nav.subscription"),
      href: "/dashboard/settings/billing",
      icon: "subscription" as const,
    },
    {
      label: t("nav.notifications"),
      href: "/dashboard/settings/notifications",
      icon: "notifications" as const,
    },
    { label: t("nav.team"), href: "/dashboard/settings/team", icon: "team" as const },
    {
      label: t("nav.accounts"),
      href: "/dashboard/settings/integrations",
      icon: "accounts" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <SettingsTabBar tabs={tabs} />
      {children}
    </div>
  );
}
