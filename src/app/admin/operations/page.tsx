import { Server } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import {
  OperationsDashboard,
  type OperationsData,
} from "@/components/admin/operations/operations-dashboard";
import { fetchAdminData } from "@/lib/admin/fetch-server-data";

export default async function OperationsPage() {
  const response = await fetchAdminData<{ data: OperationsData }>("/operations", { range: 7 });
  const initialData = response?.data ?? null;

  return (
    <AdminPageWrapper
      icon={Server}
      title="Operations Center"
      description="AI consumption, costs, and provider connectivity in one pane"
    >
      <OperationsDashboard initialData={initialData} />
    </AdminPageWrapper>
  );
}
