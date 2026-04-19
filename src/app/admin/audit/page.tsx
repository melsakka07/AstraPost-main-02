import { FileText } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { AuditLogTable } from "@/components/admin/audit/audit-log-table";
import { fetchAdminData } from "@/lib/admin/fetch-server-data";

export const metadata = { title: "Audit Log — Admin" };

export default async function AdminAuditPage() {
  const response = await fetchAdminData<any>("/audit", {
    page: 1,
    limit: 25,
  });

  return (
    <AdminPageWrapper
      icon={FileText}
      title="Audit Log"
      description="Admin action history and compliance tracking"
    >
      <AuditLogTable initialData={response ?? null} />
    </AdminPageWrapper>
  );
}
