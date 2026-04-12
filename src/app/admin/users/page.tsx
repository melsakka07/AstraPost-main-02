import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

export default async function AdminUsersPage() {
  await requireAdmin();

  redirect("/admin/subscribers");
}
