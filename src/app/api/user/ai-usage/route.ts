import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getMonthlyAiUsage } from "@/lib/services/ai-quota";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const usage = await getMonthlyAiUsage(session.user.id);
    return Response.json(usage);
  } catch {
    return new Response(JSON.stringify({ error: "Failed to fetch AI usage" }), {
      status: 500,
    });
  }
}
