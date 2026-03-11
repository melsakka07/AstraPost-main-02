import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
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

    const { suspend } = await req.json();
    const userId = params.userId;

    if (!userId) {
      return new NextResponse("User ID required", { status: 400 });
    }

    // Prevent suspending self
    if (userId === session.user.id) {
      return new NextResponse("Cannot suspend yourself", { status: 400 });
    }

    await db
      .update(user)
      .set({ isSuspended: suspend })
      .where(eq(user.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_SUSPEND]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
