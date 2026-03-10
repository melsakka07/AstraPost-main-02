import { headers } from "next/headers";
import Link from "next/link";
import { eq, and, desc } from "drizzle-orm";
import { FileText, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Drafts</h1>
      
      {draftPosts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
            <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No drafts found.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {draftPosts.map((post) => (
                <Card key={post.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6 flex flex-col h-full">
                        <div className="flex-1 mb-4">
                            <p className="line-clamp-4 whitespace-pre-wrap break-words">
                                {post.tweets[0]?.content || "Empty draft"}
                            </p>
                        </div>
                        <div className="flex justify-between items-center mt-auto pt-4 border-t">
                            <span className="text-xs text-muted-foreground">
                                Edited {new Date(post.updatedAt || post.createdAt).toLocaleDateString()}
                            </span>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={`/dashboard/compose?draft=${post.id}`}>
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Edit
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      )}
    </div>
  );
}
