import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  checkBestTimesAccessDetailed,
  createPlanLimitResponse,
} from "@/lib/middleware/require-plan";
import { getBestTimes } from "@/lib/services/best-time";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const access = await checkBestTimesAccessDetailed(session.user.id);
    if (!access.allowed) {
      return createPlanLimitResponse(access);
    }

    const times = await getBestTimes(session.user.id);
    return Response.json({ times });
  } catch (error) {
    console.error("Best Times API Error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch best times" }), { status: 500 });
  }
}
