import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { planToPrice } from "@/lib/billing-utils";
import { db } from "@/lib/db";
import { subscriptions, user } from "@/lib/schema";
import { stripe } from "@/lib/stripe";

// Extend VALID_CHECKOUT_PLANS to include "free" for cancellations
const CHANGE_PLAN_OPTIONS = [
  "free",
  "pro_monthly",
  "pro_annual",
  "agency_monthly",
  "agency_annual",
] as const;

const changePlanSchema = z.object({
  plan: z.enum(CHANGE_PLAN_OPTIONS),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ApiError.unauthorized();

  if (!stripe) {
    return ApiError.serviceUnavailable("Billing service is not configured.");
  }

  const json = await req.json();
  const result = changePlanSchema.safeParse(json);
  if (!result.success) {
    return ApiError.badRequest(result.error.issues);
  }

  const { plan } = result.data;

  // Load user to verify they have an active subscription
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { stripeCustomerId: true, plan: true },
  });

  if (!dbUser?.stripeCustomerId) {
    return ApiError.conflict("No active subscription found. Please start a subscription first.");
  }

  try {
    // Fetch the current subscription from Stripe
    const subscription: any = await stripe.subscriptions.retrieve(dbUser.stripeCustomerId);

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
      if (updatedSubscription.latest_invoice) {
        const latestInvoice = await stripe.invoices.retrieve(
          updatedSubscription.latest_invoice as string
        );
        if (latestInvoice) {
          // Sum up all proration line items
          const prorations = latestInvoice.lines.data.filter(
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
    if (error instanceof TypeError && error.message.includes("Stripe API error")) {
      console.error("[billing] change-plan Stripe API error:", error);
      return ApiError.internal(
        "Failed to update subscription. Please try again or contact support."
      );
    }
    console.error("[billing] change-plan error:", error);
    return ApiError.internal("Failed to change plan. Please try again or contact support.");
  }
}
