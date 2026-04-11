import { FileText } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { AuditLogTable } from "@/components/admin/audit/audit-log-table";

export const metadata = { title: "Audit Log — Admin" };

export default function AdminAuditPage() {
  return (
    <AdminPageWrapper
      icon={FileText}
      title="Audit Log"
      description="Admin action history and compliance tracking"
    >
      <AuditLogTable />
    </AdminPageWrapper>
  );
}
