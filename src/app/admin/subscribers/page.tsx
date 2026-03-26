import { Users } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { SubscribersTable } from "@/components/admin/subscribers/subscribers-table";

export default function AdminSubscribersPage() {
  return (
    <AdminPageWrapper
      icon={Users}
      title="Subscribers"
      description="Manage user accounts, plans, and access"
    >
      <SubscribersTable />
    </AdminPageWrapper>
  );
}
