import { headers } from "next/headers";
import { QueueEvents } from "bullmq";
import { auth } from "@/lib/auth";

// Create a new connection for events to avoid blocking the shared connection
const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
};
// If REDIS_URL is provided, we should parse it, but for simplicity let's assume env vars are set.
// Or we can reuse the connection options from ioredis if we exported them.
// Let's rely on REDIS_URL if available.

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  
  const queueEvents = new QueueEvents("schedule-queue", {
    connection: process.env.REDIS_URL ? { url: process.env.REDIS_URL } : connection,
  });

  await queueEvents.waitUntilReady();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const onCompleted = ({ jobId }: { jobId: string }) => {
        send({ type: "completed", jobId });
      };

      const onFailed = ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
        send({ type: "failed", jobId, failedReason });
      };

      const onActive = ({ jobId }: { jobId: string }) => {
        send({ type: "active", jobId });
      };

      const onProgress = ({ jobId, data }: { jobId: string; data: any }) => {
        send({ type: "progress", jobId, progress: data });
      };

      queueEvents.on("completed", onCompleted);
      queueEvents.on("failed", onFailed);
      queueEvents.on("active", onActive);
      queueEvents.on("progress", onProgress);

      // Keep alive
      const interval = setInterval(() => {
        controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        queueEvents.off("completed", onCompleted);
        queueEvents.off("failed", onFailed);
        queueEvents.off("active", onActive);
        queueEvents.off("progress", onProgress);
        queueEvents.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
