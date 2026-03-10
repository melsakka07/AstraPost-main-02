import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await db.update(user)
      .set({ onboardingCompleted: true })
      .where(eq(user.id, session.user.id));
      
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to complete onboarding:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
