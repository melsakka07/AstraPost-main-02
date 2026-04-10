import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { planToPrice } from "@/lib/billing-utils";
import { db } from "@/lib/db";
import { redis } from "@/lib/rate-limiter";
import { subscriptions } from "@/lib/schema";
import { stripe } from "@/lib/stripe";

// Extend VALID_CHECKOUT_PLANS to include "free" for cancellations and "agency" for reactivation
const CHANGE_PLAN_OPTIONS = [
  "free",
  "pro_monthly",
  "pro_annual",
  "agency",
  "agency_monthly",
  "agency_annual",
] as const;

const changePlanSchema = z.object({
  plan: z.enum(CHANGE_PLAN_OPTIONS),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ApiError.unauthorized();

  // Simple IP-based rate limit: 15 attempts per minute
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  try {
    const key = `rl:billing-change-plan:${ip}`;
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, 60);
    if (current > 15) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "Retry-After": "60" },
      });
    }
  } catch {
    // fail open if Redis unavailable
  }

  if (!stripe) {
    return ApiError.serviceUnavailable("Billing service is not configured.");
  }

  const json = await req.json();
  const result = changePlanSchema.safeParse(json);
  if (!result.success) {
    return ApiError.badRequest(result.error.issues);
  }

  const { plan } = result.data;

  // Load user's active subscription from database
  const activeSubscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, session.user.id),
  });

  // Check for active or trialing subscription
  if (
    !activeSubscription ||
    !activeSubscription.status ||
    !["active", "trialing"].includes(activeSubscription.status)
  ) {
    return ApiError.conflict("No active subscription found. Please start a subscription first.");
  }

  try {
    // Fetch the current subscription from Stripe using the subscription ID
    // activeSubscription is guaranteed to have stripeSubscriptionId since we filtered for active/trialing status
    const subscription: any = await stripe.subscriptions.retrieve(
      activeSubscription.stripeSubscriptionId!
    );

    // ── Handle cancellation (downgrade to free) ────────────────────────────────
    if (plan === "free") {
      // Schedule cancellation at period end - user keeps access until then
      await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      });

      // Immediately sync cancel_at_period_end flag to DB for UI display
      // The webhook will handle the full plan sync at period end
      const currentPeriodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null;

      // Single-table write — no transaction needed (webhook also syncs this field)
      await db
        .update(subscriptions)
        .set({ cancelAtPeriodEnd: true })
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

      return Response.json({
        effectiveDate: currentPeriodEnd?.toISOString(),
        action: "cancel_scheduled",
        message:
          "Your subscription will cancel at the end of your current billing period. You'll keep full access until then.",
      });
    }

    // ── Handle plan change (upgrade, downgrade, or cycle switch) ──────────────
    const newPriceId = planToPrice(plan);
    if (!newPriceId) {
      return ApiError.serviceUnavailable(
        `Price ID for plan "${plan}" is not configured. Contact support.`
      );
    }

    // Get the subscription item ID (first item in the subscription)
    const firstItem = subscription.items.data[0];
    if (!firstItem) {
      return ApiError.internal("Subscription has no items. Contact support.");
    }

    // Update the subscription with the new price
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: [{ id: firstItem.id, price: newPriceId }],
      proration_behavior: "create_prorations", // Stripe handles credits/charges
      // If cancelling, remove the cancel_at_period_end flag
      cancel_at_period_end: false,
    });

    // Calculate proration amount from the latest invoice
    let proratedCredit: string | null = null;
    try {
      const latestInvoice = updatedSubscription.latest_invoice;
      if (latestInvoice) {
        const invoiceId =
          typeof latestInvoice === "string" ? latestInvoice : (latestInvoice as any).id;
        if (invoiceId) {
          const invoice = await stripe.invoices.retrieve(invoiceId);
          if (invoice) {
            // Sum up all proration line items
            const prorations = invoice.lines.data.filter(
              (line) =>
                line.description?.toLowerCase().includes("proration") ||
                line.period.start !== line.period.end
            );
            const totalProration = prorations.reduce((sum, line) => sum + (line.amount || 0), 0);
            // Format as dollars (Stripe amounts are in cents)
            proratedCredit =
              totalProration < 0 ? `$${Math.abs(totalProration / 100).toFixed(2)}` : null;
          }
        }
      }
    } catch {
      // Ignore invoice retrieval errors - proration info is optional
    }

    // Sync cancel_at_period_end flag to DB immediately if user was cancelling
    // The webhook will handle the full plan sync
    if (subscription.cancel_at_period_end) {
      // Single-table write — no transaction needed (webhook also syncs this field)
      await db
        .update(subscriptions)
        .set({ cancelAtPeriodEnd: false })
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
    }

    return Response.json({
      effectiveDate: "immediate",
      action: "plan_changed",
      proratedCredit,
      newPriceId,
      message: `Your plan has been changed to ${plan.replace("_", " ").toUpperCase()}.${proratedCredit ? ` Prorated credit: ${proratedCredit}` : ""}`,
    });
  } catch (error) {
    const isStripeError = error && typeof error === "object" && "type" in error;
    if (isStripeError) {
      console.error("[billing] change-plan Stripe API error:", error);
      return ApiError.internal(
        "Failed to update subscription. Please try again or contact support."
      );
    }
    console.error("[billing] change-plan error:", error);
    return ApiError.internal("Failed to change plan. Please try again or contact support.");
  }
}
