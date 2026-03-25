import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  checkBestTimesAccessDetailed,
  createPlanLimitResponse,
} from "@/lib/middleware/require-plan";
import { AnalyticsEngine } from "@/lib/services/analytics-engine";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function GET(_req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return new Response("Unauthorized", { status: 401 });

    const access = await checkBestTimesAccessDetailed(session.user.id);
    if (!access.allowed) return createPlanLimitResponse(access);

    const buckets = await AnalyticsEngine.getBestTimesToPost(session.user.id);

    if (buckets.length < 3) {
      return Response.json({
        insufficientData: true,
        message: "Not enough data yet. Publish more posts to unlock Best Time predictions.",
        slots: [],
      });
    }

    const top3 = buckets.slice(0, 3).map((s) => {
      const ampm = s.hour >= 12 ? "PM" : "AM";
      const displayHour = s.hour % 12 === 0 ? 12 : s.hour % 12;
      return {
        day: DAY_NAMES[s.day],
        hour: s.hour,
        label: `${DAY_NAMES[s.day]} at ${displayHour}:00 ${ampm}`,
        confidence: Math.min(100, Math.round((s.count / Math.max(buckets.reduce((sum, b) => sum + b.count, 0), 1)) * 100 * 3)),
        avgEngagement: s.score,
      };
    });

    return Response.json({
      insufficientData: false,
      dataPoints: buckets.reduce((sum, b) => sum + b.count, 0),
      slots: top3,
    });
  } catch (error) {
    console.error("Best time error:", error);
    return new Response(JSON.stringify({ error: "Failed to compute best times" }), {
      status: 500,
    });
  }
}
