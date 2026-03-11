import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

const checkoutSchema = z.object({
  plan: z.enum(["pro_monthly", "pro_annual", "agency_monthly", "agency_annual"]),
});

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const json = await req.json();
    const result = checkoutSchema.safeParse(json);

    if (!result.success) {
      return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
    }

    const { plan } = result.data;

    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { stripeCustomerId: true, plan: true },
    });

    if (dbUser?.stripeCustomerId && dbUser.plan && dbUser.plan !== "free") {
      return new Response(
        JSON.stringify({
          error: "Subscription already exists. Use billing portal to manage your plan.",
          code: "existing_subscription",
        }),
        { status: 409 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
       console.error("Stripe Secret Key missing");
       return new Response(JSON.stringify({ error: "Billing service unavailable" }), { status: 503 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return new Response(
        JSON.stringify({ error: "Billing return URL is not configured", code: "billing_return_url_missing" }),
        { status: 503 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Map plan to price ID
    const priceIds: Record<string, string | undefined> = {
        pro_monthly: process.env.STRIPE_PRICE_ID_MONTHLY || "price_pro_monthly_mock",
        pro_annual: process.env.STRIPE_PRICE_ID_ANNUAL || "price_pro_annual_mock",
        agency_monthly: process.env.STRIPE_PRICE_ID_AGENCY_MONTHLY || "price_agency_monthly_mock",
        agency_annual: process.env.STRIPE_PRICE_ID_AGENCY_ANNUAL || "price_agency_annual_mock",
    };

    const priceId = priceIds[plan];

    if (!priceId) {
        return new Response(JSON.stringify({ error: "Price not configured for this plan" }), { status: 400 });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: session.user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: session.user.id,
        plan,
      },
      success_url: `${appUrl}/dashboard/settings?billing=success`,
      cancel_url: `${appUrl}/dashboard/settings?billing=cancelled`,
    });

    return Response.json({ url: checkoutSession.url });

  } catch (error) {
    console.error("Checkout Error:", error);
    return new Response(JSON.stringify({ error: "Failed to create checkout session" }), { status: 500 });
  }
}
