import "server-only";

import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TranscriptionResult {
  transcript: string;
  durationSeconds: number;
  costEstimateCents: number;
}

// ---------------------------------------------------------------------------
// Provider routing
// ---------------------------------------------------------------------------

/**
 * Transcribe audio using the specified provider.
 *
 * Routes to Deepgram or Whisper based on the `provider` parameter.
 * `mimeType` should be the audio MIME type (e.g. from `getAudioMimeType`).
 */
export async function transcribe(
  audioBuffer: Buffer,
  provider: "deepgram" | "whisper",
  mimeType: string
): Promise<TranscriptionResult> {
  logger.info("transcription_start", {
    provider,
    mimeType,
    bufferSizeBytes: audioBuffer.byteLength,
  });

  if (provider === "deepgram") {
    return transcribeWithDeepgram(audioBuffer, mimeType);
  }

  return transcribeWithWhisper(audioBuffer, mimeType);
}

// ---------------------------------------------------------------------------
// Deepgram
// ---------------------------------------------------------------------------

/**
 * Deepgram transcription.
 *
 * POSTs raw audio to Deepgram's /listen endpoint using the base model
 * with smart_format enabled.
 *
 * Cost: ~$0.0059/min (rounded to nearest cent).
 */
async function transcribeWithDeepgram(
  audioBuffer: Buffer,
  mimeType: string
): Promise<TranscriptionResult> {
  const apiKey = process.env.YOUTUBE_DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error("Deepgram API key not configured");
  }

  logger.info("deepgram_transcription_start", {
    bufferSizeBytes: audioBuffer.byteLength,
    mimeType,
  });

  let response: Response;
  try {
    response = await fetch("https://api.deepgram.com/v1/listen?model=base&smart_format=true", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": mimeType,
      },
      body: new Uint8Array(audioBuffer),
      signal: AbortSignal.timeout(120000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`deepgram_request_failed: ${String(message).slice(0, 200)}`, { error: message });
    throw new Error(`Deepgram request failed: ${message}`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "unknown");
    logger.error(`deepgram_api_error: status=${response.status}`, {
      status: response.status,
      body: body.slice(0, 500),
    });
    throw new Error(`Deepgram API returned status ${response.status}`);
  }

  let data: Record<string, unknown>;
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`deepgram_parse_failed: ${String(message).slice(0, 200)}`, { error: message });
    throw new Error(`Failed to parse Deepgram response: ${message}`);
  }

  // Deepgram /v1/listen response shape: { metadata: { duration }, results: { channels: [{ alternatives: [{ transcript }] }] } }
  const results = data["results"] as Record<string, unknown> | undefined;
  if (!results) {
    logger.error(`deepgram_missing_results: keys=${Object.keys(data).length}`, {
      keys: Object.keys(data),
    });
    throw new Error("Deepgram response missing 'results' field");
  }

  const channels = results["channels"] as Array<Record<string, unknown>> | undefined;
  const channel0 = channels?.[0];
  const alternatives = channel0?.["alternatives"] as Array<Record<string, unknown>> | undefined;
  const transcript = alternatives?.[0]?.["transcript"] as string | undefined;

  if (transcript === undefined || transcript === null) {
    logger.error(`deepgram_missing_transcript: missing in response`, { results });
    throw new Error("Deepgram response missing transcript text");
  }

  // Duration is at the top-level `metadata` object (sibling of `results`).
  const metadata = data["metadata"] as Record<string, unknown> | undefined;
  const durationSeconds =
    typeof metadata?.["duration"] === "number" ? (metadata["duration"] as number) : 0;

  // Cost: $0.0059/min (DB column is real)
  const costEstimateCents = (durationSeconds * 0.0059 * 100) / 60;

  logger.info("deepgram_transcription_success", {
    transcriptLength: transcript.length,
    durationSeconds,
    costEstimateCents,
  });

  return { transcript, durationSeconds, costEstimateCents };
}

// ---------------------------------------------------------------------------
// Whisper (OpenAI)
// ---------------------------------------------------------------------------

/**
 * Whisper transcription via OpenAI API.
 *
 * POSTs multipart form data to the Whisper-1 model.
 *
 * Cost: $0.006/min (rounded to nearest cent).
 */
async function transcribeWithWhisper(
  audioBuffer: Buffer,
  mimeType: string
): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured for Whisper");
  }

  logger.info("whisper_transcription_start", {
    bufferSizeBytes: audioBuffer.byteLength,
    mimeType,
  });

  // Determine filename extension from MIME type
  const ext = mimeType === "audio/mp4" ? "mp4" : "mp3";
  const filename = `audio.${ext}`;

  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(audioBuffer)], { type: mimeType }), filename);
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
      signal: AbortSignal.timeout(120000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`whisper_request_failed: ${String(message).slice(0, 200)}`, { error: message });
    throw new Error(`Whisper request failed: ${message}`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "unknown");
    logger.error(`whisper_api_error: status=${response.status}`, {
      status: response.status,
      body: body.slice(0, 500),
    });
    throw new Error(`Whisper API returned status ${response.status}`);
  }

  let data: Record<string, unknown>;
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`whisper_parse_failed: ${String(message).slice(0, 200)}`, { error: message });
    throw new Error(`Failed to parse Whisper response: ${message}`);
  }

  const transcript = data["text"] as string | undefined;
  if (transcript === undefined || transcript === null) {
    logger.error(`whisper_missing_text: missing in response`, { data });
    throw new Error("Whisper response missing 'text' field");
  }

  // verbose_json includes a top-level `duration` field. Fall back to segments[last].end
  // only if that's missing (older API behavior). Leave at 0 if neither is present —
  // the caller preserves the prior validated duration in that case.
  let durationSeconds = 0;
  if (typeof data["duration"] === "number") {
    durationSeconds = data["duration"] as number;
  } else {
    const segments = data["segments"] as Array<Record<string, unknown>> | undefined;
    if (segments && segments.length > 0) {
      const lastSegment = segments[segments.length - 1]!;
      const end = typeof lastSegment["end"] === "number" ? (lastSegment["end"] as number) : 0;
      durationSeconds = end;
    }
  }

  // Cost: $0.006/min (DB column is real)
  const costEstimateCents = (durationSeconds * 0.006 * 100) / 60;

  logger.info("whisper_transcription_success", {
    transcriptLength: transcript.length,
    durationSeconds,
    costEstimateCents,
  });

  return { transcript, durationSeconds, costEstimateCents };
}
