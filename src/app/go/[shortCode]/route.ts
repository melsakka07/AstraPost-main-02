import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { affiliateLinks, affiliateClicks } from "@/lib/schema";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  const { shortCode } = await params;

  if (!shortCode) {
    return new NextResponse("Invalid request", { status: 400 });
  }

  const link = await db.query.affiliateLinks.findFirst({
    where: eq(affiliateLinks.shortCode, shortCode),
  });

  if (!link) {
    return new NextResponse("Link not found", { status: 404 });
  }

  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  const referer = request.headers.get("referer") || null;
  const country = request.headers.get("x-vercel-ip-country") || null;

  // Fire and forget (in a real serverless env, use waitUntil or a queue)
  try {
      await db.transaction(async (tx) => {
          await tx.insert(affiliateClicks).values({
            id: nanoid(),
            affiliateLinkId: link.id,
            ipAddress: ip,
            userAgent: userAgent,
            country: country,
            referer: referer,
          });

          await tx.update(affiliateLinks)
            .set({ clicks: sql`${affiliateLinks.clicks} + 1` })
            .where(eq(affiliateLinks.id, link.id));
      });
  } catch (error) {
      console.error("Failed to track click", error);
  }

  return NextResponse.redirect(link.destinationUrl);
}
