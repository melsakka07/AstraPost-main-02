"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, Loader2, AlertCircle, CheckCircle2, History, Bookmark, ArrowRight, Download } from "lucide-react";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { AdaptationPanel } from "@/components/inspiration/adaptation-panel";
import { ImportedTweetCard } from "@/components/inspiration/imported-tweet-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const router = useRouter();
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

  const handleUrlChange = useCallback((value: string) => {
    setTweetUrl(value);
    setIsValidUrl(validateUrl(value));
    setError(null);
  }, [validateUrl]);

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
      setError(err instanceof Error ? err.message : "Failed to import tweet");
    } finally {
      setIsLoading(false);
    }
  }, [isValidUrl, tweetUrl]);

  // Send to Composer
  const handleSendToComposer = useCallback((tweets: string[]) => {
    sessionStorage.setItem("inspiration_tweets", JSON.stringify(tweets));
    if (importedData) {
      sessionStorage.setItem("inspiration_source_id", importedData.originalTweet.id);
    }
    router.push("/dashboard/compose");
  }, [router, importedData]);

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

      setSuccessMessage("Bookmarked successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);

      // Add to local bookmarks state
      const bookmarkData = await response.json();
      if (bookmarkData.bookmark) {
        setBookmarks((prev) => [bookmarkData.bookmark, ...prev]);
      }
    } catch (err) {
      setError("Failed to bookmark");
    } finally {
      setIsBookmarking(false);
    }
  }, [importedData, tweetUrl]);

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
  const handleReadaptBookmark = useCallback(async (bookmark: Bookmark) => {
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
      setError("Failed to load bookmarked tweet");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete bookmark
  const handleDeleteBookmark = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/inspiration/bookmark/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete bookmark");
      }

      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError("Failed to delete bookmark");
    }
  }, []);

  return (
    <DashboardPageWrapper
      icon={Lightbulb}
      title="Inspiration"
      description="Import tweets from X and adapt them with AI assistance."
    >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3 overflow-x-auto">
          <TabsTrigger value="import">
            <Download className="h-4 w-4 mr-2" />
            Import Tweet
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="bookmarks">
            <Bookmark className="h-4 w-4 mr-2" />
            Bookmarks
          </TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          {/* URL Input Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tweet-url">Paste X/Tweet URL</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="tweet-url"
                      type="url"
                      placeholder="https://x.com/username/status/1234567890"
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
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          Import
                          <ArrowRight className="h-4 w-4 ms-2 rtl:scale-x-[-1]" />
                        </>
                      )}
                    </Button>
                  </div>
                  {tweetUrl && !isValidUrl && (
                    <p className="text-xs text-muted-foreground">
                      Please enter a valid X/Twitter URL
                    </p>
                  )}
                </div>

                {/* Success Message */}
                {successMessage && (
                  <Alert className="bg-emerald-500/10 border-emerald-500/50">
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
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-20 w-full mb-4" />
                  <Skeleton className="h-12 w-1/3" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-full mb-4" />
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Imported Tweet + Adaptation Panel */}
          {importedData && !isLoading && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left: Imported Tweet */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Imported Tweet</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBookmark}
                    disabled={isBookmarking}
                  >
                    <Bookmark className="h-4 w-4 mr-2" />
                    {isBookmarking ? "Saving..." : "Bookmark"}
                  </Button>
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
              <div>
                <h2 className="text-lg font-semibold mb-4">Adapt Content</h2>
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
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6 border border-primary/10">
                  <Lightbulb className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">No tweet imported yet</h3>
                <p className="text-muted-foreground max-w-md">
                  Paste a X/Twitter URL above to import a tweet and adapt it with AI assistance.
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
                <div className="text-center py-16">
                  <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No history yet. Import a tweet to get started.</p>
                </div>
              ) : (
                <ul role="list" className="space-y-3">
                  {history.map((item) => (
                    <li
                      key={item.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">@{item.sourceTweet.author.username}</span>
                            <Badge variant="outline" className="text-xs">
                              {item.action}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.sourceTweet.text}
                          </p>
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
                <div className="text-center py-16">
                  <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No bookmarks yet. Bookmark inspiring tweets to save them for later.</p>
                </div>
              ) : (
                <ul role="list" className="space-y-3">
                  {bookmarks.map((bookmark) => (
                    <li
                      key={bookmark.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">@{bookmark.sourceAuthorHandle}</span>
                            {bookmark.action && (
                              <Badge variant="outline" className="text-xs">
                                {bookmark.action}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {bookmark.sourceText}
                          </p>
                          {bookmark.adaptedText && (
                            <p className="text-sm text-foreground mt-2 line-clamp-2">
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
                            Re-adapt
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteBookmark(bookmark.id)}
                          >
                            Delete
                          </Button>
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
