import { ToggleLeft } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { FeatureFlagsTable } from "@/components/admin/feature-flags/feature-flags-table";

export const metadata = { title: "Feature Flags — Admin" };

export default function AdminFeatureFlagsPage() {
  return (
    <AdminPageWrapper
      icon={ToggleLeft}
      title="Feature Flags"
      description="Toggle platform features on or off. Changes take effect within 60 seconds."
    >
      <FeatureFlagsTable />
    </AdminPageWrapper>
  );
}
