import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { xAccounts } from "@/lib/schema";
import { XApiService } from "@/lib/services/x-api";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");

  try {
    let client: XApiService | null;

    if (accountId) {
      // S3 — verify ownership before testing a specific account
      const account = await db.query.xAccounts.findFirst({
        where: and(
          eq(xAccounts.id, accountId),
          eq(xAccounts.userId, session.user.id)
        ),
        columns: { id: true },
      });

      if (!account) {
        return NextResponse.json(
          { ok: false, error: "Account not found" },
          { status: 404 }
        );
      }

      client = await XApiService.getClientForAccountId(accountId);
    } else {
      // Original behaviour — test the default account
      client = await XApiService.getClientForUser(session.user.id);
    }

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
    const status =
      message === "X Session expired. Please reconnect your account." ? 401 : 500;
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
