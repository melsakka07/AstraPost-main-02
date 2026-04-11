"use client";

import { Shield } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { AuditLogTable } from "@/components/admin/audit/audit-log-table";

export default function AdminAuditPage() {
  return (
    <AdminPageWrapper
      icon={Shield}
      title="Audit Log"
      description="Track all admin actions and changes."
    >
      <AuditLogTable />
    </AdminPageWrapper>
  );
}
