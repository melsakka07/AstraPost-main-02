import { GlobalAdminSearchWrapper } from "@/components/admin/global-search-wrapper";
import { AdminSidebar } from "@/components/admin/sidebar";
import { requireAdmin } from "@/lib/admin";

// Force fresh RSC payload on every navigation — prevents Next.js router cache
// from serving stale data when navigating between admin pages via sidebar links.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="bg-background min-h-dvh">
      <AdminSidebar />
      <main className="min-h-dvh p-4 md:ms-64 md:p-8">{children}</main>
      <GlobalAdminSearchWrapper />
    </div>
  );
}
