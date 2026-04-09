import { cookies, headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

// BetterAuth exposes `createSession` internally but does not include it in
// the public type surface. We declare the minimal shape we need rather than
// using @ts-ignore, so that any future signature change produces a compile
// error here instead of silently breaking at runtime.
type AdminAuthApi = typeof auth.api & {
  createSession: (opts: {
    userId: string;
    headers: Headers;
  }) => Promise<{ token?: string; session?: { token?: string } } | null>;
};

export async function POST(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // `isAdmin` is declared in auth.ts via BetterAuth additionalFields.
    // We cast narrowly rather than suppressing with @ts-ignore so that
    // any future type change produces a visible compile error.
    const sessionUser = session?.user as { isAdmin?: boolean } | undefined;
    if (!session || !sessionUser?.isAdmin) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { userId } = await params;

    if (!userId) {
      return new NextResponse("User ID required", { status: 400 });
    }

    const [targetUser] = await db.select().from(user).where(eq(user.id, userId));

    if (!targetUser) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Cast to AdminAuthApi so TypeScript enforces the call signature —
    // safer than @ts-ignore which would suppress all errors on the line.
    const adminApi = auth.api as unknown as AdminAuthApi;
    const newSession = await adminApi.createSession({
      userId,
      headers: await headers(),
    });

    if (!newSession) {
      return new NextResponse("Failed to create session", { status: 500 });
    }

    const token = newSession.token ?? newSession.session?.token;

    if (token) {
      (await cookies()).set("better-auth.session_token", token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_IMPERSONATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
