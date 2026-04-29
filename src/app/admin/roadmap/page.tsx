import { Lightbulb } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { RoadmapTable } from "@/components/admin/roadmap/roadmap-table";
import { fetchAdminData } from "@/lib/admin/fetch-server-data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Roadmap — Admin",
};

export default async function AdminRoadmapPage() {
  const response = await fetchAdminData<any>("/roadmap", {
    page: 1,
    limit: 25,
    status: "pending",
  });
  const initialData = response?.items ?? null;

  return (
    <AdminPageWrapper
      icon={Lightbulb}
      title="Roadmap"
      description="Review and moderate user-submitted feedback"
    >
      <RoadmapTable initialData={initialData} />
    </AdminPageWrapper>
  );
}
