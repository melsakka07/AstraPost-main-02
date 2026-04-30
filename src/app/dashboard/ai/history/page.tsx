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

const CONTENT_TYPES = new Set([
  "thread",
  "template",
  "hook",
  "cta",
  "rewrite",
  "variant_generator",
  "bio_optimizer",
  "reply_generator",
  "translate",
  "hashtags",
]);

const ANALYSIS_TYPES = new Set(["viral_score", "competitor_analyzer", "content_calendar", "tools"]);

const MEDIA_TYPES = new Set(["image", "image_prompt"]);

const AGENTIC_TYPES = new Set(["agentic_pipeline", "agentic_regenerate", "agentic_approve"]);

function getBadgeVariant(type: string): "secondary" | "default" | "outline" {
  if (CONTENT_TYPES.has(type)) return "secondary";
  if (ANALYSIS_TYPES.has(type)) return "default";
  if (MEDIA_TYPES.has(type)) return "default";
  if (AGENTIC_TYPES.has(type)) return "outline";
  return "outline";
}

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
            <Card key={item.id}>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Badge variant={getBadgeVariant(item.type ?? "")} className="capitalize">
                    {t(`type.${item.type}` as any) ?? item.type}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {new Date(item.createdAt).toLocaleString(userLocale)}
                  </span>
                </div>
                {item.type !== "template" && (
                  <Link href={`/dashboard/compose?restore=${item.id}`}>
                    <Button variant="ghost" size="sm" className="h-8">
                      <RefreshCcw className="me-2 h-3.5 w-3.5" />
                      {t("reuse")}
                    </Button>
                  </Link>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {item.inputPrompt && (
                  <div className="space-y-1.5">
                    <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                      {t("prompt")}
                    </span>
                    <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
                      {item.inputPrompt}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                    {t("output")}
                  </span>
                  <RenderOutput item={item} t={t} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardPageWrapper>
  );
}

type TFunc = Awaited<ReturnType<typeof getTranslations<"ai_history">>>;

function RenderOutput({ item, t }: { item: any; t: TFunc }) {
  const content = item.outputContent;

  if (item.type === "template") {
    return <p className="text-muted-foreground text-sm italic">{t("template_streamed")}</p>;
  }

  if (content === null || content === undefined) {
    return <p className="text-muted-foreground text-sm">{t("no_content")}</p>;
  }

  if (typeof content === "string") {
    const parsed = tryParseJson(content);
    if (parsed !== null) {
      return <RenderStructured content={parsed} t={t} />;
    }
    return <TextBlock text={content} />;
  }

  return <RenderStructured content={content} t={t} />;
}

function tryParseJson(str: string): unknown | null {
  try {
    const parsed = JSON.parse(str);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    /* not json */
  }
  return null;
}

function TextBlock({ text }: { text: string }) {
  return (
    <div className="bg-muted/40 rounded-lg border p-3.5 text-sm leading-relaxed whitespace-pre-wrap">
      {text}
    </div>
  );
}

function RenderStructured({ content, t }: { content: unknown; t: TFunc }) {
  if (Array.isArray(content)) {
    return (
      <div className="space-y-2">
        {content.map((item, i) => (
          <div key={i} className="bg-muted/40 rounded-lg border p-3">
            <span className="text-muted-foreground/70 mb-1.5 block text-[10px] font-bold tracking-wider uppercase">
              #{i + 1}
            </span>
            {typeof item === "object" && item !== null ? (
              <div className="space-y-1">
                {Object.entries(item as Record<string, unknown>)
                  .filter(([, v]) => v !== null && v !== undefined && v !== "")
                  .map(([key, value]) => (
                    <div key={key} className="flex items-start gap-3 text-sm">
                      <span className="text-muted-foreground/80 min-w-[80px] shrink-0 text-xs font-semibold tracking-wide capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                      <span className="text-foreground/85 min-w-0 leading-relaxed break-words">
                        {formatValue(value)}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <span className="text-sm">{String(item)}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (typeof content !== "object" || content === null) {
    return <TextBlock text={String(content)} />;
  }

  const obj = content as Record<string, unknown>;
  const hasTweets = Array.isArray(obj.tweets) && obj.tweets.length > 0;
  const hasHashtags = Array.isArray(obj.hashtags) && obj.hashtags.length > 0;
  const hasText = typeof obj.text === "string" && obj.text.length > 0;
  const hasFeedback = typeof obj.feedback === "string" && obj.feedback.length > 0;

  if (hasTweets) {
    const meta = extractMeta(obj, ["tweets", "action", "tone", "language"]);
    return (
      <div className="space-y-3">
        {meta.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {meta.map(({ key, value }) => (
              <span key={key} className="text-muted-foreground text-xs">
                <span className="font-semibold capitalize">{key}</span>: {String(value)}
              </span>
            ))}
          </div>
        )}
        <div className="space-y-2">
          {(obj.tweets as string[]).map((tweet, i) => (
            <div key={i} className="border-border/60 bg-muted/30 flex gap-3 rounded-lg border p-3">
              <span className="text-muted-foreground/70 shrink-0 pt-0.5 text-xs font-semibold tabular-nums">
                {i + 1}
              </span>
              <p className="min-w-0 text-sm leading-relaxed break-words whitespace-pre-wrap">
                {tweet}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (hasHashtags) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {(obj.hashtags as string[]).map((tag, i) => (
          <Badge key={i} variant="secondary" className="text-xs font-normal">
            {tag.startsWith("#") ? tag : `#${tag}`}
          </Badge>
        ))}
      </div>
    );
  }

  if (hasText) {
    return <TextBlock text={obj.text as string} />;
  }

  if (hasFeedback) {
    return <TextBlock text={obj.feedback as string} />;
  }

  const entries = Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== "");

  if (entries.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("no_content")}</p>;
  }

  return (
    <div className="bg-muted/40 rounded-lg border">
      {entries.map(([key, value], i) => (
        <div
          key={key}
          className={`flex items-start gap-4 px-3.5 py-2.5 text-sm ${
            i < entries.length - 1 ? "border-border/40 border-b" : ""
          }`}
        >
          <span className="text-muted-foreground/80 min-w-[100px] shrink-0 text-xs font-semibold tracking-wide capitalize">
            {key.replace(/([A-Z])/g, " $1").trim()}
          </span>
          <span className="text-foreground/85 min-w-0 leading-relaxed break-words">
            {formatValue(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function extractMeta(
  content: Record<string, unknown>,
  exclude: string[]
): { key: string; value: unknown }[] {
  return Object.entries(content)
    .filter(([k, v]) => !exclude.includes(k) && v !== null && v !== undefined && v !== "")
    .map(([key, value]) => ({ key, value }));
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
  }
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
}
