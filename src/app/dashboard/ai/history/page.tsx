import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { History, RefreshCcw, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { aiGenerations } from "@/lib/schema";

export default async function AiHistoryPage() {
  const session = await requireAdmin();
  const userLocale =
    session?.user && "language" in session.user ? (session.user as any).language : "en";
  const t = await getTranslations("ai_history");

  const history = await db.query.aiGenerations.findMany({
    where: eq(aiGenerations.userId, session.user.id),
    orderBy: [desc(aiGenerations.createdAt)],
    limit: 50,
  });

  return (
    <DashboardPageWrapper
      icon={History}
      title={t("title")}
      description={t("description")}
      actions={
        <Link href="/dashboard/compose">
          <Button>
            <Sparkles className="me-2 h-4 w-4" />
            {t("new_content")}
          </Button>
        </Link>
      }
    >
      {history.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <History className="text-muted-foreground mb-4 h-12 w-12 opacity-20" />
          <CardTitle>{t("empty_title")}</CardTitle>
          <CardDescription>{t("empty_description")}</CardDescription>
          <Link href="/dashboard/compose" className="mt-4">
            <Button variant="outline">{t("go_to_composer")}</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {history.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader className="bg-muted/30 flex flex-row items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="capitalize">
                    {t(`type.${item.type}` as any) ?? item.type}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {new Date(item.createdAt).toLocaleString(userLocale)}
                  </span>
                </div>
                <div className="flex gap-2">
                  {item.type !== "template" && (
                    <Link href={`/dashboard/compose?restore=${item.id}`}>
                      <Button variant="ghost" size="sm" className="h-8">
                        <RefreshCcw className="me-2 h-3.5 w-3.5" />
                        {t("reuse")}
                      </Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {item.inputPrompt && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                      {t("prompt")}
                    </span>
                    <p className="text-foreground/80 line-clamp-2 text-sm">{item.inputPrompt}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                    {t("output")}
                  </span>
                  <div className="bg-muted/50 overflow-wrap-anywhere rounded p-3 text-sm break-words whitespace-pre-wrap">
                    {renderOutput(item, t)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardPageWrapper>
  );
}

function renderOutput(item: any, t: Awaited<ReturnType<typeof getTranslations<"ai_history">>>) {
  const content = item.outputContent;

  if (item.type === "template") {
    return t("template_streamed");
  }

  if (!content) return t("no_content");

  if (item.type === "thread" && Array.isArray(content.tweets)) {
    return content.tweets
      .map((tweet: string, i: number) => t("tweet_number", { index: i + 1 }) + "\n" + tweet)
      .join("\n\n");
  }

  if (item.type === "hashtags" && Array.isArray(content.hashtags)) {
    return content.hashtags.join(" ");
  }

  if (content.text) return content.text;
  if (content.tweets && Array.isArray(content.tweets)) return content.tweets.join("\n\n");

  return typeof content === "string" ? content : JSON.stringify(content, null, 2);
}
