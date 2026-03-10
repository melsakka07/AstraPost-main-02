import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { XApiService } from "@/lib/services/x-api";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const client = await XApiService.getClientForUser(session.user.id);
    if (!client) {
      return NextResponse.json(
        { ok: false, error: "No connected X account" },
        { status: 400 }
      );
    }

    const me = await client.getUser();
    return NextResponse.json({
      ok: true,
      user: {
        id: me.data.id,
        name: me.data.name,
        username: me.data.username,
      },
    });
  } catch (err) {
    const code = (err as any)?.code;
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "X Session expired. Please reconnect your account." ? 401 : 500;
    return NextResponse.json(
      {
        ok: false,
        error: message,
        ...(code ? { code } : {}),
      },
      { status }
    );
  }
}
