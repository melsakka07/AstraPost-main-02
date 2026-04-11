"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { X, Heart, MessageCircle, Repeat2, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface AgenticSession {
  id: string;
  topic: string;
  status: "pending" | "running" | "completed" | "failed";
  postsGenerated: number;
  qualityScore: number;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

interface SessionPost {
  id: string;
  content: string;
  status: string;
  likes: number;
  replies: number;
  retweets: number;
  shares: number;
  qualityScore: number;
  createdAt: string;
}

interface SessionDetail extends AgenticSession {
  description?: string;
  posts: SessionPost[];
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}

export function AgenticSessionDetail({
  session,
  onClose,
}: {
  session: AgenticSession;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/agentic/sessions/${session.id}`)
      .then((r) => r.json())
      .then((json) => setDetail(json.data ?? null))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [session.id]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{session.topic}</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Session Overview */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                Status
              </p>
              <p className="text-lg font-bold capitalize">{session.status}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                Quality Score
              </p>
              <p className="text-lg font-bold">{session.qualityScore}/100</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                Posts Generated
              </p>
              <p className="text-lg font-bold">{session.postsGenerated}</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Timeline</h3>
            <div className="text-muted-foreground space-y-1 text-sm">
              <p>
                <span className="text-foreground font-medium">Started:</span>{" "}
                {format(new Date(session.startedAt), "MMM dd, yyyy HH:mm:ss")}
              </p>
              {session.completedAt && (
                <p>
                  <span className="text-foreground font-medium">Completed:</span>{" "}
                  {format(new Date(session.completedAt), "MMM dd, yyyy HH:mm:ss")}
                </p>
              )}
            </div>
          </div>

          {/* Generated Posts */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Generated Posts</h3>
            {loading ? (
              <LoadingSkeleton />
            ) : detail?.posts && detail.posts.length > 0 ? (
              <div className="space-y-3">
                {detail.posts.map((post) => (
                  <div key={post.id} className="space-y-3 rounded-lg border p-4">
                    <p className="text-foreground text-sm">{post.content}</p>
                    <div className="text-muted-foreground flex items-center justify-between text-xs">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          <span>{post.likes.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          <span>{post.replies.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Repeat2 className="h-3 w-3" />
                          <span>{post.retweets.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Share className="h-3 w-3" />
                          <span>{post.shares.toLocaleString()}</span>
                        </div>
                      </div>
                      <span className="text-foreground font-medium">
                        Quality: {post.qualityScore}/100
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No posts generated yet</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
