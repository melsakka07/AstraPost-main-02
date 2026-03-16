/**
 * AI Image Status API
 * GET /api/ai/image/status?id=<predictionId>
 *
 * Polls a single Replicate prediction. When the prediction succeeds:
 *   - Downloads the generated image
 *   - Uploads it to durable storage
 *   - Records usage in aiGenerations (idempotent via atomic Redis DEL)
 *   - Returns the stored URL + metadata
 *
 * The caller (ai-image-dialog) polls every 2 s until status is "succeeded"
 * or an error is returned.
 */

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redis } from "@/lib/rate-limiter";
import { aiGenerations } from "@/lib/schema";
import {
  checkImagePrediction,
  downloadImage,
  getDimensionsFromAspectRatio,
  type AspectRatio,
  type ImageModel,
  type ImageStyle,
} from "@/lib/services/ai-image";
import { upload } from "@/lib/storage";

interface PredictionMeta {
  userId: string;
  model: ImageModel;
  finalPrompt: string;
  aspectRatio: AspectRatio;
  style: ImageStyle | null;
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const predictionId = req.nextUrl.searchParams.get("id");
  if (!predictionId) {
    return NextResponse.json({ error: "Missing prediction ID" }, { status: 400 });
  }

  // Retrieve prediction metadata cached by the POST endpoint.
  const raw = await redis.get(`ai:img:pred:${predictionId}`);
  if (!raw) {
    return NextResponse.json(
      { error: "Prediction not found or expired" },
      { status: 404 },
    );
  }

  const meta: PredictionMeta = JSON.parse(raw);

  // Enforce ownership — only the user who created the prediction may poll it.
  if (meta.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const prediction = await checkImagePrediction(predictionId);

    // Still running — tell the client to keep polling.
    if (prediction.status === "starting" || prediction.status === "processing") {
      return NextResponse.json({ status: prediction.status });
    }

    // Terminal failure — remove key and surface the error.
    if (prediction.status === "failed" || prediction.status === "canceled") {
      await redis.del(`ai:img:pred:${predictionId}`);
      return NextResponse.json(
        { error: prediction.error ?? `Prediction ${prediction.status}` },
        { status: 422 },
      );
    }

    // status === "succeeded" ─────────────────────────────────────────────────

    if (!prediction.output) {
      await redis.del(`ai:img:pred:${predictionId}`);
      return NextResponse.json(
        { error: "No output returned from prediction" },
        { status: 500 },
      );
    }

    const replicateUrl =
      typeof prediction.output === "string"
        ? prediction.output
        : prediction.output[0]!;

    const { width, height } = getDimensionsFromAspectRatio(meta.aspectRatio);

    // Download and upload to durable storage.
    let storedUrl = replicateUrl;
    try {
      const buffer = await downloadImage(replicateUrl);
      const filename = `ai-image-${nanoid()}.png`;
      const uploadResult = await upload(buffer, filename, "ai-images");
      if (uploadResult.url) storedUrl = uploadResult.url;
    } catch (uploadErr) {
      // Non-fatal: fall back to the ephemeral Replicate URL.
      console.error("AI image upload failed, using Replicate URL:", uploadErr);
    }

    // Atomic Redis DEL is used for idempotency: if two concurrent requests both
    // receive "succeeded", only the one that successfully deletes the key (DEL
    // returns 1) records usage.  The other returns the result without re-recording.
    const deleted = await redis.del(`ai:img:pred:${predictionId}`);
    if (deleted === 1) {
      await db.insert(aiGenerations).values({
        id: nanoid(),
        userId: meta.userId,
        type: "image",
        inputPrompt: meta.finalPrompt,
        outputContent: {
          predictionId,
          model: meta.model,
          aspectRatio: meta.aspectRatio,
          style: meta.style,
          imageUrl: storedUrl,
          width,
          height,
        },
        createdAt: new Date(),
      });
    }

    return NextResponse.json({
      status: "succeeded",
      imageUrl: storedUrl,
      width,
      height,
      model: meta.model,
      prompt: meta.finalPrompt,
    });
  } catch (error) {
    console.error("AI image status check error:", error);
    return NextResponse.json(
      {
        error: "Failed to check prediction status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
