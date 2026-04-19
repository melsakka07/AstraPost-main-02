import { Users } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { SubscribersTable } from "@/components/admin/subscribers/subscribers-table";
import { fetchAdminData } from "@/lib/admin/fetch-server-data";

export default async function AdminSubscribersPage() {
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
      title="Subscribers"
      description="Manage user accounts, plans, and access"
    >
      <SubscribersTable initialData={response ?? null} />
    </AdminPageWrapper>
  );
}
