import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 });
  }

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  if (!dbUser?.stripeCustomerId) {
    return NextResponse.json({ error: "No subscription found", code: "no_subscription" }, { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("Stripe Secret Key missing");
    return NextResponse.json({ error: "Billing service unavailable", code: "billing_unavailable" }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    // apiVersion: "2024-06-20",
  });

  try {
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL;
    if (!appOrigin) {
      return NextResponse.json(
        { error: "Billing return URL is not configured", code: "billing_return_url_missing" },
        { status: 503 }
      );
    }
    const returnUrl = new URL("/dashboard/settings?billing=portal_return", appOrigin).toString();

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripeCustomerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Stripe Portal Error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session", code: "portal_session_failed" },
      { status: 500 }
    );
  }
}
