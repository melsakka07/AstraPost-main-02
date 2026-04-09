import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import Papa from "papaparse";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { scheduleQueue, SCHEDULE_JOB_OPTIONS } from "@/lib/queue/client";
import { posts, tweets, xAccounts } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

export async function POST(req: Request) {
  const ctx = await getTeamContext();
  if (!ctx) return new NextResponse("Unauthorized", { status: 401 });

  const correlationId = getCorrelationId(req);
  logger.info("api_request", {
    route: "/api/posts/bulk",
    method: "POST",
    correlationId,
    userId: ctx.session.user.id,
  });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const xAccountId = formData.get("xAccountId") as string;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!xAccountId) {
    return NextResponse.json({ error: "No X account selected" }, { status: 400 });
  }

  // Verify the selected account belongs to the current team workspace
  const account = await db.query.xAccounts.findFirst({
    where: and(eq(xAccounts.id, xAccountId), eq(xAccounts.userId, ctx.currentTeamId)),
  });

  if (!account) {
    return NextResponse.json({ error: "Invalid X account" }, { status: 400 });
  }

  const text = await file.text();

  return new Promise<NextResponse>((resolve) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const errors: string[] = [];

        // Validate headers
        if (rows.length > 0 && (!rows[0].content || !rows[0].scheduledAt)) {
          resolve(
            NextResponse.json(
              { error: "CSV must have 'content' and 'scheduledAt' columns" },
              { status: 400 }
            )
          );
          return;
        }

        const promises = rows.map(async (row, index) => {
          try {
            const content = row.content?.trim();
            const scheduledAtStr = row.scheduledAt?.trim();

            if (!content || !scheduledAtStr) return;

            const scheduledAt = new Date(scheduledAtStr);
            if (isNaN(scheduledAt.getTime())) {
              errors.push(`Row ${index + 2}: Invalid date format`);
              return;
            }

            const postId = crypto.randomUUID();
            const tweetId = crypto.randomUUID();

            // Wrap post + tweet insert in a transaction so a failure between
            // the two steps never leaves an orphaned post with no tweets.
            await db.transaction(async (tx) => {
              await tx.insert(posts).values({
                id: postId,
                userId: ctx.currentTeamId,
                xAccountId: xAccountId,
                status: "scheduled",
                scheduledAt,
                type: "tweet",
              });

              await tx.insert(tweets).values({
                id: tweetId,
                postId,
                content,
                position: 1,
              });
            });

            const delay = Math.max(0, scheduledAt.getTime() - Date.now());
            await scheduleQueue.add(
              "publish-post",
              { postId, userId: ctx.session.user.id, correlationId },
              { delay, jobId: postId, ...SCHEDULE_JOB_OPTIONS }
            );
          } catch (e) {
            errors.push(`Row ${index + 2}: ${(e as Error).message}`);
          }
        });

        await Promise.all(promises);

        resolve(
          NextResponse.json({
            success: true,
            count: rows.length - errors.length,
            errors: errors.length > 0 ? errors : undefined,
          })
        );
      },
      error: (error: any) => {
        resolve(NextResponse.json({ error: error.message }, { status: 400 }));
      },
    });
  });
}
