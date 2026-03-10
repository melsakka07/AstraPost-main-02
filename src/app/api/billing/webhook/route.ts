import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { subscriptions, user } from "@/lib/schema";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("Stripe config missing");
    return new Response("Config Error", { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Webhook signature verification failed", error);
    return new Response("Webhook Error", { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === "checkout.session.completed") {
    const subscription = (await stripe.subscriptions.retrieve(
      session.subscription as string
    )) as unknown as Stripe.Subscription;
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;

    if (!userId) {
        return new Response("Missing userId", { status: 400 });
    }

    // Update User Plan
    await db.update(user).set({ 
        plan: plan || "pro_monthly",
        stripeCustomerId: session.customer as string 
    }).where(eq(user.id, userId));

    // Create Subscription Record
    const firstItem = subscription.items.data[0];
    await db.insert(subscriptions).values({
        id: crypto.randomUUID(),
        userId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: firstItem?.price?.id || "",
        plan: plan || "pro_monthly",
        status: subscription.status,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
    });
  }

  if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      await db.update(subscriptions).set({
          status: subscription.status,
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      }).where(eq(subscriptions.stripeSubscriptionId, subscription.id));
  }

  if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      await db.update(subscriptions).set({
          status: "cancelled",
      }).where(eq(subscriptions.stripeSubscriptionId, subscription.id));
      
      // Downgrade user
      // We need to find the user associated with this subscription
      // For simplicity here, assuming we could look it up or storing customerId on user is enough
      // Ideally we query the subscription table to get the userId
      const subRecord = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.stripeSubscriptionId, subscription.id)
      });
      
      if (subRecord) {
          await db.update(user).set({ plan: "free" }).where(eq(user.id, subRecord.userId));
      }
  }

  return new Response(null, { status: 200 });
}
