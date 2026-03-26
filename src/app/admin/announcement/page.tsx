import { Megaphone } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { AnnouncementForm } from "@/components/admin/announcement/announcement-form";

export const metadata = { title: "Announcement — Admin" };

export default function AdminAnnouncementPage() {
  return (
    <AdminPageWrapper
      icon={Megaphone}
      title="Announcement Banner"
      description="Display a global banner at the top of the dashboard for all users."
    >
      <div className="max-w-2xl">
        <AnnouncementForm />
      </div>
    </AdminPageWrapper>
  );
}
