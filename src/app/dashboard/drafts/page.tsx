import { headers } from "next/headers";
import Link from "next/link";
import { eq, and, desc } from "drizzle-orm";
import { FileText, Plus } from "lucide-react";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { posts } from "@/lib/schema";

export default async function DraftsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const draftPosts = await db.query.posts.findMany({
    where: and(
        eq(posts.userId, session.user.id),
        eq(posts.status, "draft")
    ),
    orderBy: [desc(posts.updatedAt)],
    with: {
        tweets: {
            orderBy: (tweets, { asc }) => [asc(tweets.position)],
        }
    }
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
      {draftPosts.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No drafts yet"
          description="Create your first draft to start building your content library."
          primaryAction={
            <Button asChild>
              <Link href="/dashboard/compose">Create Draft</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {draftPosts.map((post) => (
                <Card key={post.id} className="group hover:shadow-lg transition-all duration-200 hover:border-primary/30">
                    <CardContent className="p-6 flex flex-col h-full">
                        <div className="flex-1 mb-4">
                            <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm leading-relaxed">
                                {post.tweets[0]?.content || "Empty draft"}
                            </p>
                        </div>
                        <div className="flex justify-between items-center mt-auto pt-4 border-t">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                Edited {new Date(post.updatedAt || post.createdAt).toLocaleDateString()}
                            </span>
                            <Button variant="ghost" size="sm" asChild className="group-hover:bg-primary/10">
                                <Link href={`/dashboard/compose?draft=${post.id}`}>
                                  Continue Editing
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      )}
    </DashboardPageWrapper>
  );
}
