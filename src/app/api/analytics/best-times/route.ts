import { headers } from "next/headers";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
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
    logger.error("Best Times API Error", { error });
    return ApiError.internal("Failed to fetch best times");
  }
}
