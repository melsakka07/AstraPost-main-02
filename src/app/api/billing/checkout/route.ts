import { headers } from "next/headers";
import { and, count, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { planToPrice, VALID_CHECKOUT_PLANS } from "@/lib/billing-utils";
import { db } from "@/lib/db";
import { checkIpRateLimit } from "@/lib/rate-limiter";
import { promoCodes, subscriptions, user } from "@/lib/schema";
import { stripe } from "@/lib/stripe";

const checkoutSchema = z.object({
  plan: z.enum(VALID_CHECKOUT_PLANS),
  promoCode: z.string().min(1).max(50).optional(),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ApiError.unauthorized();

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rlResult = await checkIpRateLimit(ip, "billing:checkout", 10, 60);
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

  const json = await req.json();
  const result = checkoutSchema.safeParse(json);
  if (!result.success) {
    return ApiError.badRequest(result.error.issues);
  }

  const { plan, promoCode } = result.data;

  const priceId = planToPrice(plan);
  if (!priceId) {
    return ApiError.serviceUnavailable(
      `Price ID for plan "${plan}" is not configured. Contact support.`
    );
  }

  // Load the user record to check for existing subscription / customer
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { stripeCustomerId: true, plan: true, trialEndsAt: true },
  });

  // Block re-subscription if user has an active or trialing subscription
  const existingSub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, session.user.id),
    columns: { status: true },
  });
  if (existingSub && ["active", "trialing"].includes(existingSub.status ?? "")) {
    return ApiError.conflict(
      "An active subscription already exists. Use the billing portal to change your plan."
    );
  }

  // ── Customer lookup / create ────────────────────────────────────────────────
  // Reuse the existing Stripe customer so payment history is preserved.
  let stripeCustomerId = dbUser?.stripeCustomerId ?? null;

  if (!stripeCustomerId) {
    // Check again in case of race condition (two concurrent checkout requests)
    const freshUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { stripeCustomerId: true },
    });
    if (freshUser?.stripeCustomerId) {
      stripeCustomerId = freshUser.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name ?? undefined,
        metadata: { userId: session.user.id },
      });
      stripeCustomerId = customer.id;

      // Persist the new customer ID immediately so retries reuse it.
      await db.update(user).set({ stripeCustomerId }).where(eq(user.id, session.user.id));

      // If user has pending referral credits, flush them to Stripe customer balance
      const [creditRow] = await db
        .select({ value: user.referralCredits })
        .from(user)
        .where(eq(user.id, session.user.id))
        .limit(1);
      const pendingCredits = creditRow?.value ?? 0;
      if (pendingCredits > 0) {
        try {
          await stripe.customers.createBalanceTransaction(stripeCustomerId, {
            amount: -pendingCredits * 100,
            currency: "usd",
            description: `Referral credits: $${pendingCredits}`,
          });
        } catch (err) {
          console.error("[billing] failed to apply referral credits to Stripe balance", err);
        }
      }

      // Reset referral credits after applying to Stripe (even if application failed, prevent retry)
      if (pendingCredits > 0) {
        await db.update(user).set({ referralCredits: 0 }).where(eq(user.id, session.user.id));
      }
    }
  }

  // ── Trial eligibility ───────────────────────────────────────────────────────
  // Only offer the Stripe-level 14-day trial on the user's first ever
  // subscription. If they have any prior subscription record they've already
  // used their trial.
  const [subCountRow] = await db
    .select({ value: count() })
    .from(subscriptions)
    .where(eq(subscriptions.userId, session.user.id));
  const hasHadSubscription = (subCountRow?.value ?? 0) > 0;

  const trialDays = hasHadSubscription ? undefined : 14;

  // ── Promo code resolution ───────────────────────────────────────────────────
  // Validate against our DB and resolve the Stripe coupon ID (if any).
  let stripeCouponId: string | null = null;
  if (promoCode) {
    const upperCode = promoCode.toUpperCase();
    const [promo] = await db
      .select({
        isActive: promoCodes.isActive,
        stripeCouponId: promoCodes.stripeCouponId,
        validFrom: promoCodes.validFrom,
        validTo: promoCodes.validTo,
        maxRedemptions: promoCodes.maxRedemptions,
        redemptionsCount: promoCodes.redemptionsCount,
      })
      .from(promoCodes)
      .where(and(eq(promoCodes.code, upperCode), isNull(promoCodes.deletedAt)))
      .limit(1);

    if (promo && promo.isActive) {
      const now = new Date();
      const valid =
        (!promo.validFrom || new Date(promo.validFrom) <= now) &&
        (!promo.validTo || new Date(promo.validTo) >= now) &&
        (promo.maxRedemptions === null || promo.redemptionsCount < promo.maxRedemptions);

      if (valid) {
        stripeCouponId = promo.stripeCouponId;
      }
    }
  }

  // ── Create Checkout Session ─────────────────────────────────────────────────
  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      ...(trialDays !== undefined ? { subscription_data: { trial_period_days: trialDays } } : {}),
      // Apply our promo code as a Stripe discount if we have a coupon ID,
      // otherwise keep allow_promotion_codes: true for native Stripe codes.
      ...(stripeCouponId
        ? { discounts: [{ coupon: stripeCouponId }] }
        : { allow_promotion_codes: true }),
      metadata: { userId: session.user.id, plan },
      success_url: `${appUrl}/dashboard/settings?billing=success`,
      cancel_url: `${appUrl}/pricing?billing=cancelled`,
    });

    return Response.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("[billing] checkout session creation failed", error);
    return ApiError.internal("Failed to create checkout session.");
  }
}
