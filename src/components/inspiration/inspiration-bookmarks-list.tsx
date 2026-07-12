"use client";

import { Bookmark as BookmarkIcon, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { Bookmark } from "./inspiration-types";

interface InspirationBookmarksListProps {
  bookmarks: Bookmark[];
  onReadapt: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  /** Called when the user clicks the CTA in the empty state (e.g. navigates to Import tab). */
  onNavigateToImport?: () => void;
}

export function InspirationBookmarksList({
  bookmarks,
  onReadapt,
  onDelete,
  onNavigateToImport,
}: InspirationBookmarksListProps) {
  const t = useTranslations("inspiration");
  const tBookmarks = useTranslations("inspiration.bookmarks");

  return (
    <Card>
      <CardContent className="p-6">
        {bookmarks.length === 0 ? (
          <EmptyState
            icon={<BookmarkIcon className="h-5 w-5 opacity-50" />}
            title={tBookmarks("empty_title")}
            description={tBookmarks("empty_description")}
            primaryAction={
              onNavigateToImport ? (
                <Button onClick={onNavigateToImport}>
                  <Download className="me-2 h-4 w-4" />
                  {tBookmarks("go_to_import")}
                </Button>
              ) : undefined
            }
            className="border-0 bg-transparent py-16"
          />
        ) : (
          <ul role="list" className="space-y-3">
            {bookmarks.map((bookmark) => (
              <li
                key={bookmark.id}
                className="hover:bg-muted/50 rounded-lg border p-4 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="font-medium">@{bookmark.sourceAuthorHandle}</span>
                      {bookmark.action && (
                        <Badge variant="outline" className="text-xs">
                          {bookmark.action}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {bookmark.sourceText}
                    </p>
                    {bookmark.adaptedText && (
                      <p className="text-foreground mt-2 line-clamp-2 text-sm">
                        {bookmark.adaptedText}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onReadapt(bookmark)}>
                      {t("re_adapt")}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          {t("delete")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("delete_confirm_title")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("delete_confirm_description")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(bookmark.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t("delete_button")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
