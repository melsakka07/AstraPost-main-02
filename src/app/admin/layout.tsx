import { AdminSidebar } from "@/components/admin/sidebar";
import { requireAdmin } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-dvh bg-background">
      <AdminSidebar />
      <main className="flex-1 ms-64 p-8">
        {children}
      </main>
    </div>
  );
}
