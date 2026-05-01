import { FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { AuditLogTable } from "@/components/admin/audit/audit-log-table";
import { fetchAdminData } from "@/lib/admin/fetch-server-data";

export const metadata = { title: "Audit Log — Admin" };

export default async function AdminAuditPage() {
  const t = await getTranslations("admin");
  const response = await fetchAdminData<any>("/audit", {
    page: 1,
    limit: 25,
  });

  return (
    <AdminPageWrapper
      icon={FileText}
      title={t("pages.audit.title")}
      description={t("pages.audit.description")}
    >
      <AuditLogTable initialData={response ?? null} />
    </AdminPageWrapper>
  );
}
