import { Users } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { SubscriberDetailView } from "@/components/admin/subscribers/subscriber-detail";
import { db } from "@/lib/db";

export default async function AdminSubscriberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const subscriber = await db.query.user.findFirst({
    where: (users, { eq }) => eq(users.id, id),
    columns: { name: true, email: true },
  });

  const subscriberName = subscriber?.name || subscriber?.email || "Unknown";

  return (
    <AdminPageWrapper
      icon={Users}
      title="Subscriber detail"
      description="Full profile, usage, and account management"
      breadcrumbs={[
        { label: "Subscribers", href: "/admin/subscribers" },
        { label: subscriberName },
      ]}
    >
      <SubscriberDetailView subscriberId={id} />
    </AdminPageWrapper>
  );
}
