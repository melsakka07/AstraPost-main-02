import { Lightbulb } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { RoadmapTable } from "@/components/admin/roadmap/roadmap-table";

export default function AdminRoadmapPage() {
  return (
    <AdminPageWrapper
      icon={Lightbulb}
      title="Roadmap"
      description="Review and moderate user-submitted feedback"
    >
      <RoadmapTable />
    </AdminPageWrapper>
  );
}
