import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { getConversionFunnel, getStartDate } from "@/lib/services/affiliate-stats";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  const startDate = getStartDate("30d");

  const stages = await getConversionFunnel(startDate);

  return Response.json({
    data: {
      stages,
    },
  });
}
