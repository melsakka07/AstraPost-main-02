import { redirect } from "next/navigation";

export default function SettingsPage() {
  // Redirect to profile settings for backwards compatibility
  redirect("/dashboard/settings/profile");
}
