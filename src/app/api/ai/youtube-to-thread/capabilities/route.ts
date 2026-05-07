import "server-only";

import { getServerEnv } from "@/lib/env";
import { getTeamContext } from "@/lib/team-context";

export async function GET(_req: Request) {
  const ctx = await getTeamContext();
  if (!ctx) {
    return new Response("Unauthorized", { status: 401 });
  }

  const env = getServerEnv();
  return Response.json({
    providers: {
      deepgram: Boolean(env.YOUTUBE_DEEPGRAM_API_KEY),
      whisper: Boolean(env.OPENAI_API_KEY),
    },
  });
}
