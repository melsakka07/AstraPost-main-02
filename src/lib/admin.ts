import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";

/**
 * Page-level admin guard. Redirects non-admins.
 * Use in Server Components / page layouts.
 */
export async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const u = session.user as { isAdmin?: boolean; id: string };

  if (!u.isAdmin) {
    redirect("/dashboard");
  }

  return session;
}

type AdminApiResult =
  | { ok: true; session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>> }
  | { ok: false; response: Response };

/**
 * API route admin guard. Returns session or an error Response.
 * Use in Route Handlers:
 *
 * @example
 *   const auth = await requireAdminApi();
 *   if (!auth.ok) return auth.response;
 */
export async function requireAdminApi(): Promise<AdminApiResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { ok: false, response: ApiError.unauthorized() };
  }

  const u = session.user as { isAdmin?: boolean; id: string };

  if (!u.isAdmin) {
    return { ok: false, response: ApiError.forbidden("Admin access required") };
  }

  return { ok: true, session };
}
