import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

export async function DELETE(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  try {
    // Delete user (cascade will handle related data)
    await db.delete(user).where(eq(user.id, userId));

    // Sign out logic might be handled by client redirection after this call
    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
