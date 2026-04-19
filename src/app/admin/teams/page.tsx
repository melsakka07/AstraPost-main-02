import { Users } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { TeamDashboard } from "@/components/admin/teams/team-dashboard";
import { fetchAdminData } from "@/lib/admin/fetch-server-data";

export const metadata = { title: "Teams — Admin" };

export default async function AdminTeamsPage() {
  const response = await fetchAdminData<any>("/teams", { page: 1, tab: "teams" });
  const initialData = response ?? null;

  return (
    <AdminPageWrapper
      icon={Users}
      title="Team Management"
      description="Overview of teams, members, and pending invitations."
    >
      <TeamDashboard initialData={initialData} />
    </AdminPageWrapper>
  );
}
