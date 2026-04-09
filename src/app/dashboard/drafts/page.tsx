import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, and, desc } from "drizzle-orm";
import { FileText, Plus } from "lucide-react";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { DraftsClient } from "@/components/drafts/drafts-client";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { posts } from "@/lib/schema";

export default async function DraftsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?callbackUrl=/dashboard/drafts");

  const draftPosts = await db.query.posts.findMany({
    where: and(eq(posts.userId, session.user.id), eq(posts.status, "draft")),
    orderBy: [desc(posts.updatedAt)],
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

  return (
    <DashboardPageWrapper
      icon={FileText}
      title="Drafts"
      description="Manage your saved drafts and continue editing."
      actions={
        <Button asChild>
          <Link href="/dashboard/compose">
            <Plus className="mr-2 h-4 w-4" />
            New Draft
          </Link>
        </Button>
      }
    >
      <DraftsClient drafts={draftPosts} />
    </DashboardPageWrapper>
  );
}
