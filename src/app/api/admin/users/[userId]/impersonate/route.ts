import { NextRequest, NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // @ts-ignore
    if (!session || !session.user.isAdmin) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const targetUserId = params.userId;

    if (!targetUserId) {
      return new NextResponse("User ID required", { status: 400 });
    }

    const [targetUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, targetUserId));

    if (!targetUser) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Use internal API to create session
    // @ts-ignore
    const newSession = await auth.api.createSession({
        userId: targetUserId,
        headers: await headers(),
    });

    if (!newSession) {
         return new NextResponse("Failed to create session", { status: 500 });
    }
    
    // Manually set the cookie
    // Assuming token is in newSession.token or similar structure returned by createSession
    // Better Auth usually returns { session, user }
    // session object has 'token' property
    
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
