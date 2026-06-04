import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { type ConsumptionRange, getConsumption } from "@/lib/services/consumption-metrics";
import { getServiceConnectivity } from "@/lib/services/service-connectivity";

// ── GET /api/admin/operations ─────────────────────────────────────────────────
// Single-pane data for the Operations Center: internal AI consumption (calls,
// tokens, cost — authoritative, from `ai_generations`) plus on-demand provider
// connectivity and best-effort balances. No cron, no new external tokens required.

function parseRange(value: string | null): ConsumptionRange {
  const n = Number(value);
  if (n === 1) return 1;
  if (n === 30) return 30;
  return 7;
}

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  const { searchParams } = new URL(request.url);
  const rangeDays = parseRange(searchParams.get("range"));

  try {
    const [consumption, connectivity] = await Promise.all([
      getConsumption(rangeDays),
      getServiceConnectivity(),
    ]);

    return Response.json({ data: { consumption, connectivity } });
  } catch (err) {
    logger.error("operations_dashboard_failed", {
      error: err instanceof Error ? err.message : String(err),
      rangeDays,
    });
    return ApiError.internal("Failed to load operations data");
  }
}
