"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarPlus, FileText, Image as ImageIcon, Search } from "lucide-react";
import { DeleteDraftButton } from "@/components/drafts/delete-draft-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DraftMedia = { id: string };
type DraftTweet = { id: string; content: string | null; position: number; media: DraftMedia[] };
type Draft = {
  id: string;
  updatedAt: Date | null;
  createdAt: Date;
  tweets: DraftTweet[];
};

type SortKey = "updatedAt" | "createdAt" | "length";

export function DraftsClient({ drafts }: { drafts: Draft[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("updatedAt");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = q
      ? drafts.filter((d) =>
          (d.tweets[0]?.content ?? "").toLowerCase().includes(q)
        )
      : [...drafts];

    if (sort === "updatedAt") {
      result = result.sort(
        (a, b) =>
          new Date(b.updatedAt ?? b.createdAt).getTime() -
          new Date(a.updatedAt ?? a.createdAt).getTime()
      );
    } else if (sort === "createdAt") {
      result = result.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } else if (sort === "length") {
      result = result.sort(
        (a, b) =>
          (b.tweets[0]?.content?.length ?? 0) -
          (a.tweets[0]?.content?.length ?? 0)
      );
    }
    return result;
  }, [drafts, search, sort]);

  if (drafts.length === 0) {
    return (
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Search + Sort bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search drafts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search drafts"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Sort drafts">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updatedAt">Last edited</SelectItem>
            <SelectItem value="createdAt">Oldest first</SelectItem>
            <SelectItem value="length">Longest draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          No drafts match your search.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((post) => {
            const firstTweet = post.tweets[0];
            const isThread = post.tweets.length > 1;
            const hasMedia = post.tweets.some((t) => t.media.length > 0);
            const editedDate = new Date(
              post.updatedAt ?? post.createdAt
            ).toLocaleDateString();

            return (
              <Card
                key={post.id}
                className="group hover:shadow-lg transition-all duration-200 hover:border-primary/30"
              >
                <CardContent className="p-6 flex flex-col h-full">
                  {/* Thread / Tweet badge */}
                  <div className="mb-3 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {isThread
                        ? `Thread · ${post.tweets.length} tweets`
                        : "Tweet"}
                    </span>
                    {hasMedia && (
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                        <ImageIcon className="h-3 w-3" />
                        Media
                      </span>
                    )}
                  </div>

                  {/* Content preview */}
                  <div className="flex-1 mb-4">
                    <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {firstTweet?.content ? (
                        firstTweet.content
                      ) : (
                        <span className="text-muted-foreground/60 italic">
                          No content yet — click to continue editing
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-auto pt-4 border-t">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Edited {editedDate}
                    </span>
                    <div className="flex items-center gap-1">
                      <DeleteDraftButton
                        postId={post.id}
                        ariaLabel={`Delete draft: ${(firstTweet?.content ?? "").slice(0, 50)}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        aria-label={`Schedule draft: ${(firstTweet?.content ?? "").slice(0, 50)}`}
                      >
                        <Link
                          href={`/dashboard/compose?draft=${post.id}&openSchedule=1`}
                        >
                          <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                          Schedule
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="group-hover:bg-primary/10 h-7 px-2 text-xs"
                      >
                        <Link href={`/dashboard/compose?draft=${post.id}`}>
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
