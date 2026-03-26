import { Users } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { SubscriberDetailView } from "@/components/admin/subscribers/subscriber-detail";

export default async function AdminSubscriberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminPageWrapper
      icon={Users}
      title="Subscriber detail"
      description="Full profile, usage, and account management"
    >
      <SubscriberDetailView subscriberId={id} />
    </AdminPageWrapper>
  );
}
