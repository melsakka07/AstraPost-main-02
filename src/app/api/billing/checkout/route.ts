import { headers } from "next/headers";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { planToPrice, VALID_CHECKOUT_PLANS } from "@/lib/billing-utils";
import { db } from "@/lib/db";
import { subscriptions, user } from "@/lib/schema";
import { stripe } from "@/lib/stripe";

const checkoutSchema = z.object({
  plan: z.enum(VALID_CHECKOUT_PLANS),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ApiError.unauthorized();

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

  const { plan } = result.data;

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

  // Block re-subscription via checkout if already on a paid plan with active billing
  if (dbUser?.stripeCustomerId && dbUser.plan && dbUser.plan !== "free") {
    return ApiError.conflict(
      "An active subscription already exists. Use the billing portal to change your plan."
    );
  }

  // ── Customer lookup / create ────────────────────────────────────────────────
  // Reuse the existing Stripe customer so payment history is preserved.
  let stripeCustomerId = dbUser?.stripeCustomerId ?? null;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      name: session.user.name ?? undefined,
      metadata: { userId: session.user.id },
    });
    stripeCustomerId = customer.id;

    // Persist the new customer ID immediately so retries reuse it.
    await db
      .update(user)
      .set({ stripeCustomerId })
      .where(eq(user.id, session.user.id));
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

  // ── Create Checkout Session ─────────────────────────────────────────────────
  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      ...(trialDays !== undefined
        ? { subscription_data: { trial_period_days: trialDays } }
        : {}),
      allow_promotion_codes: true,
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
