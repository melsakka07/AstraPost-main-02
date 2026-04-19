import { FileText } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { ContentDashboard } from "@/components/admin/content/content-dashboard";
import { fetchAdminData } from "@/lib/admin/fetch-server-data";

export const metadata = { title: "Content Performance — Admin" };

export default async function AdminContentPage() {
  const response = await fetchAdminData<any>("/content", { page: 1 });
  const initialData = response?.data ?? null;

  return (
    <AdminPageWrapper
      icon={FileText}
      title="Content Performance"
      description="Post analytics, top performing content, and failure tracking."
    >
      <ContentDashboard initialData={initialData} />
    </AdminPageWrapper>
  );
}
