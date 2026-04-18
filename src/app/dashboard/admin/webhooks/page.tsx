import { redirect } from "next/navigation";

export default async function OldWebhooksPage() {
  // Redirect to new admin webhooks page
  redirect("/admin/webhooks");
}
