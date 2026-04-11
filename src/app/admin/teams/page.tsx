import { Users } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { TeamDashboard } from "@/components/admin/teams/team-dashboard";

export const metadata = { title: "Teams — Admin" };

export default function AdminTeamsPage() {
  return (
    <AdminPageWrapper
      icon={Users}
      title="Team Management"
      description="Overview of teams, members, and pending invitations."
    >
      <TeamDashboard />
    </AdminPageWrapper>
  );
}
