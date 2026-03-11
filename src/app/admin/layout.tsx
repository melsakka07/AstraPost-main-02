import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Toaster } from "@/components/ui/sonner";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Check for admin role
  // @ts-ignore - isAdmin is added to schema but might not be in inferred types yet
  if (!session.user.isAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 md:p-8 max-w-7xl">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  );
}
