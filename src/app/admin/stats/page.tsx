import { BarChart2 } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { PlatformStats } from "@/components/admin/stats/platform-stats";

export const metadata = { title: "Platform Stats — Admin" };

export default function AdminStatsPage() {
  return (
    <AdminPageWrapper
      icon={BarChart2}
      title="Platform Stats"
      description="User growth, content activity, AI usage, and queue health."
    >
      <PlatformStats />
    </AdminPageWrapper>
  );
}
