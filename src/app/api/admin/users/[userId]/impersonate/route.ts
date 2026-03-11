import { cookies, headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // @ts-ignore
    if (!session || !session.user.isAdmin) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { userId } = await params;

    if (!userId) {
      return new NextResponse("User ID required", { status: 400 });
    }

    const [targetUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId));

    if (!targetUser) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Use internal API to create session
    // @ts-ignore
    const newSession = await auth.api.createSession({
        userId: userId,
        headers: await headers(),
    });

    if (!newSession) {
         return new NextResponse("Failed to create session", { status: 500 });
    }
    
    // @ts-ignore
    const token = newSession.token || newSession.session?.token;
    
    if (token) {
        (await cookies()).set("better-auth.session_token", token, {
            path: "/",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7 // 1 week
        });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[ADMIN_IMPERSONATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
