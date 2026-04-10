import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkIpRateLimit } from "@/lib/rate-limiter";
import { user } from "@/lib/schema";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ApiError.unauthorized();

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rlResult = await checkIpRateLimit(ip, "billing:portal", 10, 60);
  if (rlResult?.limited) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Retry-After": String(rlResult.retryAfter) },
    });
  }

  if (!stripe) {
    return ApiError.serviceUnavailable("Billing service is not configured.");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return ApiError.serviceUnavailable("App URL is not configured.");
  }

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { stripeCustomerId: true },
  });

  if (!dbUser?.stripeCustomerId) {
    return ApiError.badRequest("No billing account found.");
  }

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripeCustomerId,
      return_url: `${appUrl}/dashboard/settings?billing=portal_return`,
    });

    return Response.json({ url: portalSession.url });
  } catch (error) {
    console.error("[billing] portal session creation failed", error);
    return ApiError.internal("Failed to create portal session.");
  }
}
