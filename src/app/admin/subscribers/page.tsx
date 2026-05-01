import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { SubscribersTable } from "@/components/admin/subscribers/subscribers-table";
import { fetchAdminData } from "@/lib/admin/fetch-server-data";

export default async function AdminSubscribersPage() {
  const t = await getTranslations("admin");
  const response = await fetchAdminData<any>("/subscribers", {
    page: 1,
    limit: 25,
    filter: "all",
    sort: "createdAt",
    order: "desc",
  });

  return (
    <AdminPageWrapper
      icon={Users}
      title={t("pages.subscribers.title")}
      description={t("pages.subscribers.description")}
    >
      <SubscribersTable initialData={response ?? null} />
    </AdminPageWrapper>
  );
}
