import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Check if user is admin
  // We access the user property which should contain the custom fields from our schema
  const user = session.user as any;
  
  if (!user.isAdmin) {
    redirect("/dashboard");
  }

  return session;
}
