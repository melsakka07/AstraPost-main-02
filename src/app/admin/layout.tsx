import { GlobalAdminSearch } from "@/components/admin/global-search";
import { AdminSidebar } from "@/components/admin/sidebar";
import { requireAdmin } from "@/lib/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="bg-background flex min-h-dvh">
      <AdminSidebar />
      <main className="ms-64 flex-1 p-4 md:p-8">{children}</main>
      <GlobalAdminSearch />
    </div>
  );
}
