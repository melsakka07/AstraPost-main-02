import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AIWriterClient } from "@/components/ai/ai-writer-client";
import { auth } from "@/lib/auth";
import { getMonthlyAiUsage, getMonthlyImageUsage } from "@/lib/services/ai-quota";

export default async function AIWriterPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [aiUsage, imageUsage] = await Promise.all([
    getMonthlyAiUsage(session.user.id).catch(() => null),
    getMonthlyImageUsage(session.user.id).catch(() => null),
  ]);

  return <AIWriterClient aiUsage={aiUsage} imageUsage={imageUsage} />;
}
