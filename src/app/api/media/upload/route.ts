import { headers } from "next/headers";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limiter";
import { user } from "@/lib/schema";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const dbUser = await db.query.user.findFirst({
        where: eq(user.id, session.user.id),
        columns: { plan: true }
    });
    
    const { success, reset } = await checkRateLimit(session.user.id, dbUser?.plan || "free", "media");
    if (!success) {
        return new Response(JSON.stringify({ 
            error: "Too many requests", 
            retryAfter: Math.ceil((reset - Date.now()) / 1000) 
        }), { 
            status: 429,
            headers: { "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString() }
        });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response("No file uploaded", { status: 400 });
    }

    const mimeType = file.type;
    const isImage = mimeType.startsWith("image/");
    const isVideo = mimeType.startsWith("video/");
    const isGif = mimeType === "image/gif";

    if (!isImage && !isVideo) {
      return new Response("Unsupported file type", { status: 400 });
    }

    const maxBytes = isVideo ? 50 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      return new Response("File too large", { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name);
    const filename = `${randomUUID()}${ext}`;
    
    // In production, upload to S3/R2/Blob. 
    // For this local setup, we save to public/uploads
    const uploadDir = path.join(process.cwd(), "public/uploads");
    const filePath = path.join(uploadDir, filename);

    await mkdir(uploadDir, { recursive: true });
    
    await writeFile(filePath, buffer);

    const url = `/uploads/${filename}`;

    const fileType = isGif ? "gif" : isVideo ? "video" : "image";

    return Response.json({
      url,
      filename,
      mimeType,
      fileType,
      size: file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
