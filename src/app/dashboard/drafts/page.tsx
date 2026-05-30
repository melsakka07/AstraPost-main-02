import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, and, desc } from "drizzle-orm";
import { FileText, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { DraftsClient } from "@/components/drafts/drafts-client";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { posts } from "@/lib/schema";

const DRAFTS_PAGE_SIZE = 12;

export default async function DraftsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const t = await getTranslations("drafts");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?callbackUrl=/dashboard/drafts");

  const params = await searchParams;
  const pageParam = params.page;
  const page = Math.max(
    0,
    parseInt(Array.isArray(pageParam) ? (pageParam[0] ?? "0") : (pageParam ?? "0"), 10) || 0
  );

  const draftPosts = await db.query.posts.findMany({
    where: and(eq(posts.userId, session.user.id), eq(posts.status, "draft")),
    orderBy: [desc(posts.updatedAt)],
    limit: DRAFTS_PAGE_SIZE + 1,
    offset: page * DRAFTS_PAGE_SIZE,
    with: {
      tweets: {
        orderBy: (tweets, { asc }) => [asc(tweets.position)],
        with: {
          media: {
            columns: { id: true },
          },
        },
      },
    },
  });

  const hasMore = draftPosts.length > DRAFTS_PAGE_SIZE;
  const paginatedDrafts = hasMore ? draftPosts.slice(0, DRAFTS_PAGE_SIZE) : draftPosts;

  return (
    <DashboardPageWrapper
      icon={FileText}
      title={t("title")}
      description={t("description")}
      actions={
        <Button asChild>
          <Link href="/dashboard/compose">
            <Plus className="me-2 h-4 w-4" />
            {t("new_draft")}
          </Link>
        </Button>
      }
    >
      <DraftsClient drafts={paginatedDrafts} hasMore={hasMore} page={page} />
    </DashboardPageWrapper>
  );
}
