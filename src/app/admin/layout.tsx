import { getTranslations } from "next-intl/server";
import { GlobalAdminSearchWrapper } from "@/components/admin/global-search-wrapper";
import { AdminSidebar } from "@/components/admin/sidebar";
import { requireAdmin } from "@/lib/admin";

// Force fresh RSC payload on every navigation — prevents Next.js router cache
// from serving stale data when navigating between admin pages via sidebar links.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const t = await getTranslations();

  return (
    <div className="bg-background min-h-dvh">
      <a
        href="#main-content"
        className="focus:bg-primary focus:text-primary-foreground sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-3 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:outline-none"
      >
        {t("dashboard.skip_to_content")}
      </a>
      <AdminSidebar />
      <main id="main-content" className="min-h-dvh p-4 md:ms-64 md:p-8">
        {children}
      </main>
      <GlobalAdminSearchWrapper />
    </div>
  );
}
