import { ToggleLeft } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { FeatureFlagsTable } from "@/components/admin/feature-flags/feature-flags-table";
import { fetchAdminData } from "@/lib/admin/fetch-server-data";

export const metadata = { title: "Feature Flags — Admin" };

export default async function AdminFeatureFlagsPage() {
  const response = await fetchAdminData<any>("/feature-flags");
  const initialData = response?.data ?? null;

  return (
    <AdminPageWrapper
      icon={ToggleLeft}
      title="Feature Flags"
      description="Toggle platform features on or off. Changes take effect within 60 seconds."
    >
      <FeatureFlagsTable initialData={initialData} />
    </AdminPageWrapper>
  );
}
