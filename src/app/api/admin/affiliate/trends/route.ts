import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { getTrendsData, getStartDate } from "@/lib/services/affiliate-stats";

const querySchema = z.object({
  period: z.enum(["7d", "30d", "90d"]).default("30d"),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApi();
    if (!auth.ok) return auth.response;

    const rl = await checkAdminRateLimit("read");
    if (rl) return rl;

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

    const { period } = parsed.data;

    const startDate = getStartDate(period);
    const data = await getTrendsData(startDate);

    return Response.json({
      data: {
        data,
      },
    });
  } catch (err) {
    console.error("[affiliate/trends] Error:", err);
    return ApiError.internal("Failed to load affiliate trends");
  }
}
