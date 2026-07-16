import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, desc, count } from "drizzle-orm";
import { History, RefreshCcw, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AiHistoryCollapsibleCard } from "@/components/dashboard/ai-history-collapsible-card";
import { AiHistoryDeleteButton } from "@/components/dashboard/ai-history-delete-button";
import { AiHistoryImagePreview } from "@/components/dashboard/ai-history-image-preview";
import { AiHistoryPagination } from "@/components/dashboard/ai-history-pagination";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchNoResultsIllustration } from "@/components/ui/illustrations";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { db } from "@/lib/db";
import { aiGenerations } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";
import { cn } from "@/lib/utils";

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
  "youtube_to_thread",
  "transcription",
  "url_to_thread",
  "pdf_to_thread",
]);

const ANALYSIS_TYPES = new Set(["viral_score", "competitor_analyzer", "content_calendar", "tools"]);

const MEDIA_TYPES = new Set(["image", "image_prompt"]);

const AGENTIC_TYPES = new Set(["agentic_pipeline", "agentic_regenerate", "agentic_approve"]);

const RESTORE_SUPPORTED_TYPES = new Set([
  "thread",
  "hook",
  "cta",
  "rewrite",
  "translate",
  "hashtags",
]);

interface ReplyData {
  tweetText?: string;
  tweetAuthor?: string;
  replies: Array<{ text: string; type: "agree" | "counter" | "funny" }>;
}

function safeTypeLabel(t: TFunc, type: string | null): string {
  if (!type) return "";
  try {
    return t(`type.${type}` as any) as string;
  } catch {
    return type;
  }
}

function getBadgeVariant(type: string): "secondary" | "default" | "outline" {
  if (CONTENT_TYPES.has(type)) return "secondary";
  if (ANALYSIS_TYPES.has(type)) return "default";
  if (MEDIA_TYPES.has(type)) return "default";
  if (AGENTIC_TYPES.has(type)) return "outline";
  return "outline";
}

const PAGE_SIZE = 25;

function groupByDate(
  items: Awaited<ReturnType<typeof db.query.aiGenerations.findMany>>
): { label: string; items: typeof items }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const d = new Date(item.createdAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    let label: string;
    if (day === today.getTime()) label = "today";
    else if (day === yesterday.getTime()) label = "yesterday";
    else if (day >= weekAgo.getTime())
      label = new Intl.DateTimeFormat("en", { weekday: "long" }).format(d).toLowerCase();
    else label = "earlier";

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(item);
  }

  const order = ["today", "yesterday"];
  const result: { label: string; items: typeof items }[] = [];
  for (const key of order) {
    if (groups.has(key)) result.push({ label: key, items: groups.get(key)! });
  }
  for (const [key, items] of groups) {
    if (!order.includes(key)) result.push({ label: key, items });
  }
  return result;
}

export default async function AiHistoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; type?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const page = Math.max(1, parseInt(resolvedParams?.page ?? "1", 10) || 1);
  const typeFilter = resolvedParams?.type ?? "all";

  const ctx = await getTeamContext();
  if (!ctx) redirect("/login");
  const userLocale =
    ctx.session.user && "language" in ctx.session.user ? (ctx.session.user as any).language : "en";
  const t = await getTranslations("ai_history");

  // typeFilter from URL params — exclude null since the enum column is nullable but our filter values are not
  type FilterType = NonNullable<typeof aiGenerations.$inferSelect.type>;
  const typeCondition =
    typeFilter && typeFilter !== "all"
      ? eq(aiGenerations.type, typeFilter as FilterType)
      : undefined;

  const [totalResult, history] = await Promise.all([
    db
      .select({ total: count() })
      .from(aiGenerations)
      .where(
        typeCondition
          ? and(eq(aiGenerations.userId, ctx.currentTeamId), typeCondition)
          : eq(aiGenerations.userId, ctx.currentTeamId)
      ),
    db.query.aiGenerations.findMany({
      where: typeCondition
        ? and(eq(aiGenerations.userId, ctx.currentTeamId), typeCondition)
        : eq(aiGenerations.userId, ctx.currentTeamId),
      orderBy: [desc(aiGenerations.createdAt)],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  ]);

  const total = Number(totalResult[0]?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // History is for creative output the user might want to revisit, not for
  // utility/search queries (trends, competitor analysis, etc.).
  const displayHistory = history.filter((item) => item.type !== "tools");

  const ALL_DISPLAY_TYPES = new Set([
    ...CONTENT_TYPES,
    ...MEDIA_TYPES,
    ...ANALYSIS_TYPES,
    ...AGENTIC_TYPES,
  ]);
  // Remove "tools" since it's already filtered out
  ALL_DISPLAY_TYPES.delete("tools");

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
      <Card className="mb-6">
        <CardContent className="pt-4">
          <form className="flex flex-wrap items-end gap-3" method="GET">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">{t("filter_type_label")}</Label>
              <Select name="type" defaultValue={typeFilter}>
                <SelectTrigger className="h-10 sm:min-w-[200px]">
                  <SelectValue placeholder={t("filter_type_all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filter_type_all")}</SelectItem>
                  {[...ALL_DISPLAY_TYPES].sort().map((type) => (
                    <SelectItem key={type} value={type}>
                      {safeTypeLabel(t, type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" variant="default" size="default" className="h-10">
              {t("filter_apply")}
            </Button>
            {typeFilter && typeFilter !== "all" && (
              <Link href="?page=1" className="inline-flex items-center">
                <Button variant="ghost" size="sm" className="text-muted-foreground h-10">
                  {t("filter_type_all")}
                </Button>
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      {displayHistory.length === 0 ? (
        <>
          <EmptyState
            icon={<SearchNoResultsIllustration className="h-6 w-6" />}
            title={t("empty_title")}
            description={t("empty_description")}
            whyMessage={t("empty_why")}
            primaryAction={
              <Button variant="outline" asChild>
                <Link href="/dashboard/compose">{t("go_to_composer")}</Link>
              </Button>
            }
          />
          <div className="mt-8">
            <h3 className="mb-4 text-sm font-semibold">{t("empty_suggestions")}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link href="/dashboard/compose" className="group">
                <Card className="hover:border-primary/50 h-full transition-colors">
                  <CardContent className="p-4">
                    <h4 className="group-hover:text-primary text-sm font-semibold transition-colors">
                      {t("suggestion_thread")}
                    </h4>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {t("suggestion_thread_desc")}
                    </p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/dashboard/compose" className="group">
                <Card className="hover:border-primary/50 h-full transition-colors">
                  <CardContent className="p-4">
                    <h4 className="group-hover:text-primary text-sm font-semibold transition-colors">
                      {t("suggestion_reply")}
                    </h4>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {t("suggestion_reply_desc")}
                    </p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/dashboard/compose" className="group">
                <Card className="hover:border-primary/50 h-full transition-colors">
                  <CardContent className="p-4">
                    <h4 className="group-hover:text-primary text-sm font-semibold transition-colors">
                      {t("suggestion_image")}
                    </h4>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {t("suggestion_image_desc")}
                    </p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/dashboard/compose" className="group">
                <Card className="hover:border-primary/50 h-full transition-colors">
                  <CardContent className="p-4">
                    <h4 className="group-hover:text-primary text-sm font-semibold transition-colors">
                      {t("suggestion_hashtags")}
                    </h4>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {t("suggestion_hashtags_desc")}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          {groupByDate(displayHistory).map((group) => (
            <div key={group.label}>
              <div className="mb-4">
                <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  {t(group.label as any)}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {group.items.map((item) => (
                  <Card key={item.id}>
                    <CardHeader className="flex flex-row items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Badge variant={getBadgeVariant(item.type ?? "")} className="capitalize">
                          {safeTypeLabel(t, item.type)}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {new Date(item.createdAt).toLocaleString(userLocale)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {item.type !== "template" &&
                          RESTORE_SUPPORTED_TYPES.has(item.type ?? "") &&
                          item.outputContent !== null && (
                            <Link href={`/dashboard/compose?restore=${item.id}`}>
                              <Button variant="ghost" size="sm" className="h-8">
                                <RefreshCcw className="me-2 h-3.5 w-3.5" />
                                {t("reuse")}
                              </Button>
                            </Link>
                          )}
                        <AiHistoryDeleteButton generationId={item.id} />
                      </div>
                    </CardHeader>
                    <AiHistoryCollapsibleCard>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                              {t("output")}
                            </span>
                            <CopyButton
                              value={extractTextContent(item)}
                              variant="ghost"
                              className="text-muted-foreground hover:text-foreground h-5 w-5"
                            />
                          </div>
                          <RenderOutput item={item} t={t} />
                        </div>
                      </CardContent>
                    </AiHistoryCollapsibleCard>
                  </Card>
                ))}
              </div>
            </div>
          ))}
          <AiHistoryPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            typeFilter={typeFilter}
          />
        </div>
      )}
    </DashboardPageWrapper>
  );
}

type TFunc = Awaited<ReturnType<typeof getTranslations<"ai_history">>>;

function RenderOutput({ item, t }: { item: any; t: TFunc }) {
  const content = item.outputContent;

  if (item.type === "template") {
    const parsed = typeof content === "string" ? tryParseJson(content) : content;
    if (parsed && typeof parsed === "object") {
      return <RenderStructured content={parsed} t={t} />;
    }
    if (typeof content === "string" && content.length > 0) {
      return <TextBlock text={content} />;
    }
    return <p className="text-muted-foreground text-sm italic">{t("template_streamed")}</p>;
  }

  if (item.type === "image" || item.type === "image_prompt") {
    const imgData = (typeof content === "string" ? tryParseJson(content) : content) as Record<
      string,
      unknown
    > | null;
    if (imgData?.imageUrl) {
      return (
        <AiHistoryImagePreview
          content={
            imgData as {
              imageUrl?: string;
              model?: string;
              style?: string;
              width?: number;
              height?: number;
              aspectRatio?: string;
              predictionId?: string;
            }
          }
        />
      );
    }
    return <TextBlock text={typeof content === "string" ? content : JSON.stringify(content)} />;
  }

  if (item.type === "reply_generator") {
    const parsed = typeof content === "string" ? tryParseJson(content) : content;
    if (parsed && typeof parsed === "object" && "replies" in (parsed as Record<string, unknown>)) {
      return <ReplyCards data={parsed as ReplyData} t={t} />;
    }
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

function extractTextContent(item: any): string {
  const c = item.outputContent;
  if (!c) return "";
  if (typeof c === "string") return c;
  if (typeof c === "object") {
    const obj = c as Record<string, unknown>;
    if (Array.isArray(obj.tweets)) return (obj.tweets as string[]).join("\n\n");
    if (Array.isArray(obj.posts)) return (obj.posts as string[]).join("\n\n");
    if (Array.isArray(obj.replies))
      return (obj.replies as Array<{ text: string }>).map((r) => r.text).join("\n\n");
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.feedback === "string") return obj.feedback;
    return JSON.stringify(c, null, 2);
  }
  return String(c);
}

function TextBlock({ text }: { text: string }) {
  return (
    <div
      className="bg-muted/40 rounded-lg border p-3.5 text-sm leading-relaxed whitespace-pre-wrap"
      dir="auto"
    >
      {text}
    </div>
  );
}

function ReplyCards({ data, t }: { data: ReplyData; t: TFunc }) {
  const typeBadgeClasses: Record<string, string> = {
    agree: "bg-success-3 text-success-11",
    counter: "bg-warning-3 text-warning-11",
    funny: "bg-brand-3 text-brand-11",
  };

  return (
    <div className="space-y-3">
      {data.tweetText && (
        <div
          className="text-muted-foreground border-border line-clamp-2 border-s-2 ps-3 text-xs italic"
          dir="auto"
        >
          {data.tweetText}
        </div>
      )}
      {data.replies.map((reply, i) => (
        <div key={i} className="bg-muted/40 border-border flex gap-3 rounded-lg border p-3">
          <span className="text-muted-foreground/70 shrink-0 pt-0.5 text-xs font-semibold tabular-nums">
            #{i + 1}
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <span
              className={cn(
                "inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                typeBadgeClasses[reply.type] ?? "bg-muted"
              )}
            >
              {t(`reply_type_${reply.type}` as any)}
            </span>
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap" dir="auto">
              {reply.text}
            </p>
          </div>
        </div>
      ))}
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
                      <span
                        className="text-foreground/85 min-w-0 leading-relaxed break-words"
                        dir="auto"
                      >
                        {formatValue(value)}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <span className="text-sm" dir="auto">
                {String(item)}
              </span>
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
  const effectiveTweets = obj.tweets || obj.posts;
  const hasTweets = Array.isArray(effectiveTweets) && effectiveTweets.length > 0;
  const hasHashtags = Array.isArray(obj.hashtags) && obj.hashtags.length > 0;
  const hasText = typeof obj.text === "string" && obj.text.length > 0;
  const hasFeedback = typeof obj.feedback === "string" && obj.feedback.length > 0;

  if (hasTweets) {
    const meta = extractMeta(obj, ["tweets", "posts", "action", "tone", "language"]);
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
          {(effectiveTweets as string[]).map((tweet, i) => (
            <div key={i} className="border-border/60 bg-muted/30 flex gap-3 rounded-lg border p-3">
              <span className="text-muted-foreground/70 shrink-0 pt-0.5 text-xs font-semibold tabular-nums">
                {i + 1}
              </span>
              <p
                className="min-w-0 text-sm leading-relaxed break-words whitespace-pre-wrap"
                dir="auto"
              >
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

  const INTERNAL_KEYS = new Set([
    "action",
    "tone",
    "language",
    "sourceLanguage",
    "mode",
    "promptVersion",
  ]);
  const displayEntries = Object.entries(obj).filter(
    ([k, v]) => !INTERNAL_KEYS.has(k) && v !== null && v !== undefined && v !== ""
  );

  if (displayEntries.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("no_content")}</p>;
  }

  return (
    <div className="bg-muted/40 rounded-lg border">
      {displayEntries.map(([key, value], i) => (
        <div
          key={key}
          className={`flex items-start gap-4 px-3.5 py-2.5 text-sm ${
            i < displayEntries.length - 1 ? "border-border/40 border-b" : ""
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
