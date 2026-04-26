"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Lightbulb,
  Loader2,
  AlertCircle,
  CheckCircle2,
  History,
  Bookmark,
  ArrowRight,
  Download,
  ExternalLink,
  RefreshCw,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { AdaptationPanel } from "@/components/inspiration/adaptation-panel";
import { ImportedTweetCard } from "@/components/inspiration/imported-tweet-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useElapsedTime } from "@/hooks/use-elapsed-time";
import type { ImportedTweetContext } from "@/lib/services/tweet-importer";

interface Bookmark {
  id: string;
  sourceTweetId: string;
  sourceTweetUrl: string;
  sourceAuthorHandle: string;
  sourceText: string;
  adaptedText: string | null;
  action: string | null;
  tone: string | null;
  language: string | null;
  createdAt: string;
}

interface HistoryItem {
  id: string;
  sourceTweet: {
    id: string;
    text: string;
    author: {
      name: string;
      username: string;
    };
  };
  adaptedTweets: string[];
  action: string;
  createdAt: string;
}

export default function InspirationPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center">
          <Loader2 className="text-muted-foreground mx-auto h-6 w-6 animate-spin" />
        </div>
      }
    >
      <InspirationContent />
    </Suspense>
  );
}

function InspirationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("inspiration");
  const [tweetUrl, setTweetUrl] = useState("");
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importedData, setImportedData] = useState<ImportedTweetContext | null>(null);
  const [showThreadContext, setShowThreadContext] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // History and Bookmarks state
  const [activeTab, setActiveTab] = useState<"import" | "history" | "bookmarks">("import");
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("inspiration_history");
      return stored ? (JSON.parse(stored) as HistoryItem[]) : [];
    } catch {
      return [];
    }
  });
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const importElapsed = useElapsedTime(isLoading);

  // Persist history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("inspiration_history", JSON.stringify(history));
    } catch {
      // localStorage may be unavailable (private mode, storage full) — fail silently
    }
  }, [history]);

  // URL validation
  const validateUrl = useCallback((url: string) => {
    const patterns = [
      /twitter\.com\/[\w]+\/status\/(\d+)/i,
      /x\.com\/[\w]+\/status\/(\d+)/i,
      /x\.com\/i\/web\/status\/(\d+)/i,
      /mobile\.twitter\.com\/[\w]+\/status\/(\d+)/i,
    ];
    return patterns.some((pattern) => pattern.test(url));
  }, []);

  const handleUrlChange = useCallback(
    (value: string) => {
      setTweetUrl(value);
      setIsValidUrl(validateUrl(value));
      setError(null);
    },
    [validateUrl]
  );

  // Initialize from URL search params or sessionStorage
  useEffect(() => {
    // 1. Check URL parameters (e.g., ?url=https://x.com/...)
    const urlParam = searchParams.get("url");
    if (urlParam && validateUrl(urlParam)) {
      setTweetUrl(urlParam);
      setIsValidUrl(true);
      return;
    }

    // 2. Fallback to session storage to persist across reloads
    try {
      const storedUrl = sessionStorage.getItem("inspiration_current_url");
      if (storedUrl && validateUrl(storedUrl)) {
        setTweetUrl(storedUrl);
        setIsValidUrl(true);

        // Also try to restore the imported data to avoid refetching on every reload
        const storedData = sessionStorage.getItem("inspiration_current_data");
        if (storedData) {
          setImportedData(JSON.parse(storedData));
        }
      }
    } catch {
      // Ignore
    }
  }, [searchParams, validateUrl]);

  // Save current url/data to sessionStorage whenever they change
  useEffect(() => {
    try {
      if (tweetUrl) {
        sessionStorage.setItem("inspiration_current_url", tweetUrl);
      } else {
        sessionStorage.removeItem("inspiration_current_url");
      }

      if (importedData) {
        sessionStorage.setItem("inspiration_current_data", JSON.stringify(importedData));
      } else {
        sessionStorage.removeItem("inspiration_current_data");
      }
    } catch {
      // Ignore
    }
  }, [tweetUrl, importedData]);

  // Import tweet
  const handleImport = useCallback(async () => {
    if (!isValidUrl || !tweetUrl.trim()) return;

    setIsLoading(true);
    setError(null);
    setImportedData(null);
    setShowThreadContext(false);

    try {
      const response = await fetch("/api/x/tweet-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweetUrl }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to import tweet");
      }

      const result = await response.json();
      setImportedData(result.data);

      // Add to history
      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        sourceTweet: {
          id: result.data.originalTweet.id,
          text: result.data.originalTweet.text,
          author: {
            name: result.data.originalTweet.author.name,
            username: result.data.originalTweet.author.username,
          },
        },
        adaptedTweets: [],
        action: "imported",
        createdAt: new Date().toISOString(),
      };
      setHistory((prev) => [historyItem, ...prev.slice(0, 19)]); // Keep last 20
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_import"));
    } finally {
      setIsLoading(false);
    }
  }, [isValidUrl, tweetUrl, t]);

  // Send to Composer
  const handleSendToComposer = useCallback(
    (tweets: string[]) => {
      sessionStorage.setItem("inspiration_tweets", JSON.stringify(tweets));
      if (importedData) {
        sessionStorage.setItem("inspiration_source_id", importedData.originalTweet.id);
        // W4: Store source attribution for display in Composer
        try {
          sessionStorage.setItem(
            "inspiration_attribution",
            JSON.stringify({
              handle: importedData.originalTweet.author.username,
              url: tweetUrl,
            })
          );
        } catch {
          // sessionStorage may be unavailable — fail silently
        }
      }
      router.push("/dashboard/compose");
    },
    [router, importedData, tweetUrl]
  );

  // Bookmark the current inspiration
  const handleBookmark = useCallback(async () => {
    if (!importedData) return;

    setIsBookmarking(true);
    try {
      const response = await fetch("/api/inspiration/bookmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceTweetId: importedData.originalTweet.id,
          sourceTweetUrl: tweetUrl,
          sourceAuthorHandle: importedData.originalTweet.author.username,
          sourceText: importedData.originalTweet.text,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to bookmark");
      }

      setSuccessMessage(t("success_message"));
      setTimeout(() => setSuccessMessage(null), 3000);

      // Add to local bookmarks state
      const bookmarkData = await response.json();
      if (bookmarkData.bookmark) {
        setBookmarks((prev) => [bookmarkData.bookmark, ...prev]);
      }
    } catch (err) {
      setError(t("error_bookmark"));
    } finally {
      setIsBookmarking(false);
    }
  }, [importedData, tweetUrl, t]);

  // Clear imported tweet and URL
  const handleClear = useCallback(() => {
    setTweetUrl("");
    setIsValidUrl(false);
    setImportedData(null);
    setShowThreadContext(false);
    setError(null);
    setSuccessMessage(null);

    // Clear sessionStorage
    try {
      sessionStorage.removeItem("inspiration_current_url");
      sessionStorage.removeItem("inspiration_current_data");
    } catch {
      // Ignore
    }
  }, []);

  // Load bookmarks on mount
  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        const response = await fetch("/api/inspiration/bookmark");
        if (response.ok) {
          const data = await response.json();
          setBookmarks(data.bookmarks || []);
        }
      } catch (err) {
        console.error("Failed to load bookmarks:", err);
      }
    };

    loadBookmarks();
  }, []);

  // Re-adapt bookmark
  const handleReadaptBookmark = useCallback(
    async (bookmark: Bookmark) => {
      setTweetUrl(bookmark.sourceTweetUrl);
      setIsValidUrl(true);

      try {
        setIsLoading(true);
        const response = await fetch("/api/x/tweet-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tweetUrl: bookmark.sourceTweetUrl }),
        });

        if (!response.ok) {
          throw new Error("Failed to import tweet");
        }

        const result = await response.json();
        setImportedData(result.data);
        setActiveTab("import");
      } catch (err) {
        setError(t("error_reimport"));
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

  // Delete bookmark
  const handleDeleteBookmark = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/inspiration/bookmark/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete bookmark");
        }

        setBookmarks((prev) => prev.filter((b) => b.id !== id));
      } catch (err) {
        setError(t("error_delete"));
      }
    },
    [t]
  );

  return (
    <DashboardPageWrapper icon={Lightbulb} title={t("title")} description={t("description")}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3 overflow-x-auto">
          <TabsTrigger value="import">
            <Download className="me-2 h-4 w-4" />
            {t("tabs.import")}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="me-2 h-4 w-4" />
            {t("tabs.history")}
          </TabsTrigger>
          <TabsTrigger value="bookmarks">
            <Bookmark className="me-2 h-4 w-4" />
            {t("tabs.bookmarks")}
          </TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          {/* URL Input Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tweet-url">{t("paste_url")}</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="tweet-url"
                      type="url"
                      placeholder={t("url_placeholder")}
                      value={tweetUrl}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && isValidUrl) {
                          handleImport();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleImport}
                      disabled={!isValidUrl || isLoading}
                      className="w-full sm:w-auto"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="me-2 h-4 w-4 animate-spin" />
                          {t("importing", { seconds: importElapsed })}
                        </>
                      ) : (
                        <>
                          {t("import_button")}
                          <ArrowRight className="ms-2 h-4 w-4 rtl:scale-x-[-1]" />
                        </>
                      )}
                    </Button>
                  </div>
                  {tweetUrl.length >= 5 && !isValidUrl && (
                    <p className="text-destructive flex items-center gap-1.5 text-xs">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {t("invalid_url")}
                    </p>
                  )}
                </div>

                {/* Success Message */}
                {successMessage && (
                  <Alert className="border-emerald-500/50 bg-emerald-500/10">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <AlertDescription className="text-emerald-600">
                      {successMessage}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Error Message */}
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="mb-4 h-4 w-3/4" />
                  <Skeleton className="mb-2 h-4 w-1/2" />
                  <Skeleton className="mb-4 h-20 w-full" />
                  <Skeleton className="h-12 w-1/3" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="mb-4 h-6 w-full" />
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Imported Tweet + Adaptation Panel */}
          {importedData && !isLoading && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left: Imported Tweet */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2 sm:items-center">
                  <div>
                    <h2 className="text-base font-semibold sm:text-lg">{t("imported_tweet")}</h2>
                    <p className="text-muted-foreground text-xs sm:text-sm">
                      {t("original_content")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleBookmark}
                      disabled={isBookmarking}
                      title={isBookmarking ? t("saving") : t("bookmark")}
                      className="h-8 w-8 sm:h-10 sm:w-10"
                    >
                      <Bookmark className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleClear}
                      title={t("clear")}
                      className="h-8 w-8 sm:h-10 sm:w-10"
                    >
                      <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
                <ImportedTweetCard
                  tweet={importedData.originalTweet}
                  parentTweets={importedData.parentTweets}
                  topReplies={importedData.topReplies}
                  quotedTweet={importedData.quotedTweet ?? undefined}
                  showThreadContext={showThreadContext}
                  onToggleThread={() => setShowThreadContext(!showThreadContext)}
                />
              </div>

              {/* Right: Adaptation Panel */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">{t("adapt_content")}</h2>
                  <p className="text-muted-foreground text-sm">{t("adapt_description")}</p>
                </div>
                <AdaptationPanel
                  sourceTweet={importedData.originalTweet}
                  threadContext={[
                    ...importedData.parentTweets.map((t) => t.text),
                    ...importedData.topReplies.map((t) => t.text),
                  ]}
                  onSendToComposer={handleSendToComposer}
                />
              </div>
            </div>
          )}

          {/* Empty State */}
          {!importedData && !isLoading && !error && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center px-4 py-12 text-center sm:py-16">
                <div className="from-primary/10 to-primary/5 border-primary/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full border bg-gradient-to-br sm:mb-6 sm:h-20 sm:w-20">
                  <Lightbulb className="text-primary h-8 w-8 sm:h-10 sm:w-10" />
                </div>
                <h3 className="mb-2 text-lg font-semibold sm:mb-3 sm:text-xl">
                  {t("no_tweet_imported")}
                </h3>
                <p className="text-muted-foreground max-w-md text-sm sm:text-base">
                  {t("no_tweet_description")}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardContent className="p-6">
              {history.length === 0 ? (
                <div className="py-16 text-center">
                  <History className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p className="text-muted-foreground">{t("no_history")}</p>
                </div>
              ) : (
                <ul role="list" className="space-y-3">
                  {history.map((item) => (
                    <li
                      key={item.id}
                      className="hover:bg-muted/50 rounded-lg border p-4 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="font-medium">@{item.sourceTweet.author.username}</span>
                            <Badge variant="outline" className="text-xs">
                              {item.action}
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-muted-foreground line-clamp-2 text-sm">
                            {item.sourceTweet.text}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              const tweetUrl = `https://x.com/${item.sourceTweet.author.username}/status/${item.sourceTweet.id}`;
                              setTweetUrl(tweetUrl);
                              setIsValidUrl(true);
                              setActiveTab("import");
                            }}
                          >
                            <RefreshCw className="me-1 h-3 w-3" />
                            {t("re_import")}
                          </Button>
                          <a
                            href={`https://x.com/${item.sourceTweet.author.username}/status/${item.sourceTweet.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground hover:bg-accent inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {t("view_on_x")}
                          </a>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bookmarks Tab */}
        <TabsContent value="bookmarks">
          <Card>
            <CardContent className="p-6">
              {bookmarks.length === 0 ? (
                <div className="py-16 text-center">
                  <Bookmark className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p className="text-muted-foreground">{t("no_bookmarks")}</p>
                </div>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReadaptBookmark(bookmark)}
                          >
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
                                  onClick={() => handleDeleteBookmark(bookmark.id)}
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
        </TabsContent>
      </Tabs>
    </DashboardPageWrapper>
  );
}
