import { z } from "zod";
import { logger } from "@/lib/logger";

const logSchema = z.object({
  level: z.enum(["debug", "info", "warn", "error"]),
  message: z.string(),
  timestamp: z.string().datetime(),
  fields: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = logSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: "Invalid log payload" }, { status: 400 });
    }

    const { level, message, fields } = parsed.data;

    // Log to server logger with [CLIENT] prefix to distinguish from server logs
    if (level === "debug") {
      logger.debug(`[CLIENT] ${message}`, { clientLog: true, ...fields });
    } else if (level === "info") {
      logger.info(`[CLIENT] ${message}`, { clientLog: true, ...fields });
    } else if (level === "warn") {
      logger.warn(`[CLIENT] ${message}`, { clientLog: true, ...fields });
    } else {
      logger.error(`[CLIENT] ${message}`, { clientLog: true, ...fields });
    }

    return Response.json({ ok: true });
  } catch (error) {
    logger.error("Failed to parse client log", {
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ error: "Failed to log" }, { status: 500 });
  }
}
