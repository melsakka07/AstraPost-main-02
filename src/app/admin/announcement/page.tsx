import { eq } from "drizzle-orm";
import { Megaphone } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { AnnouncementForm } from "@/components/admin/announcement/announcement-form";
import { db } from "@/lib/db";
import { featureFlags } from "@/lib/schema";

export const metadata = { title: "Announcement — Admin" };

const ANNOUNCEMENT_KEY = "_announcement";

export default async function AdminAnnouncementPage() {
  const flag = await db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.key, ANNOUNCEMENT_KEY))
    .limit(1)
    .then((r) => r[0] ?? null);

  let initialData = { text: "", type: "info" as const, enabled: false };
  if (flag) {
    try {
      initialData = { ...JSON.parse(flag.description ?? "{}"), enabled: flag.enabled };
    } catch {
      initialData = { text: flag.description ?? "", type: "info" as const, enabled: flag.enabled };
    }
  }

  return (
    <AdminPageWrapper
      icon={Megaphone}
      title="Announcement Banner"
      description="Display a global banner at the top of the dashboard for all users."
    >
      <div className="max-w-2xl">
        <AnnouncementForm initialData={initialData} />
      </div>
    </AdminPageWrapper>
  );
}
