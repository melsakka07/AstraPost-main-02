import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Generate a random state for CSRF protection
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/linkedin/callback`,
    state: state,
    scope: "w_member_social profile email openid",
  });

  redirect(`https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`);
}
