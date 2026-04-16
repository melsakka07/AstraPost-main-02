import { headers } from "next/headers";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { getMonthlyAiUsage } from "@/lib/services/ai-quota";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return ApiError.unauthorized();
  }

  try {
    const usage = await getMonthlyAiUsage(session.user.id);
    return Response.json(usage);
  } catch {
    return ApiError.internal("Failed to fetch AI usage");
  }
}
