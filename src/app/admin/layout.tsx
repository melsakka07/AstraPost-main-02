import { GlobalAdminSearch } from "@/components/admin/global-search";
import { AdminSidebar } from "@/components/admin/sidebar";
import { requireAdmin } from "@/lib/admin";

// Force fresh RSC payload on every navigation — prevents Next.js router cache
// from serving stale data when navigating between admin pages via sidebar links.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="bg-background flex min-h-dvh">
      <AdminSidebar />
      <main className="flex-1 p-4 md:p-8 lg:ms-64">{children}</main>
      <GlobalAdminSearch />
    </div>
  );
}
