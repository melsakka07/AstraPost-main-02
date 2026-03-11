import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { referrerId } = await req.json();

    if (!referrerId) {
      return NextResponse.json({ error: "Referrer ID is required" }, { status: 400 });
    }

    if (session.user.id === referrerId) {
      return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
    }

    // Only set if not already set
    const currentUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { referredBy: true }
    });

    if (currentUser?.referredBy) {
      return NextResponse.json({ error: "Referrer already set" }, { status: 400 });
    }

    // Update user
    await db.update(user)
      .set({ referredBy: referrerId })
      .where(eq(user.id, session.user.id));

    // Optional: Add credits to referrer here or via a separate event listener
    // For now, just link them.

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Set referrer error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
