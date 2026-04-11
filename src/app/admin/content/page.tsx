import { FileText } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { ContentDashboard } from "@/components/admin/content/content-dashboard";

export const metadata = { title: "Content Performance — Admin" };

export default function AdminContentPage() {
  return (
    <AdminPageWrapper
      icon={FileText}
      title="Content Performance"
      description="Post analytics, top performing content, and failure tracking."
    >
      <ContentDashboard />
    </AdminPageWrapper>
  );
}
