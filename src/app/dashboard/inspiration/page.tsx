"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, Loader2, AlertCircle, CheckCircle2, History, Bookmark, ArrowRight, Trash2 } from "lucide-react";
import { AdaptationPanel } from "@/components/inspiration/adaptation-panel";
import { ImportedTweetCard } from "@/components/inspiration/imported-tweet-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isBookmarking, setIsBookmarking] = useState(false);

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
    // Store tweets in sessionStorage for the composer to pick up
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
    // Import the tweet from the bookmark
    setTweetUrl(bookmark.sourceTweetUrl);
    setIsValidUrl(true);

    // Trigger import
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

  // Re-adapt history item
  const handleReadaptHistory = useCallback(async (_item: HistoryItem) => {
    // For history, we'd need to reconstruct the URL
    // For now, just show an alert
    alert("Re-adapt from history coming soon!");
  }, []);

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Lightbulb className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Inspiration</h1>
            <p className="text-muted-foreground">
              Import tweets from X and adapt them with AI assistance
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="mb-6">
          <TabsTrigger value="import">Import Tweet</TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-1" />
            History
          </TabsTrigger>
          <TabsTrigger value="bookmarks">
            <Bookmark className="h-4 w-4 mr-1" />
            Bookmarks
          </TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          {/* URL Input Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="tweet-url" className="text-sm font-medium mb-2 block">
                    Paste X/Tweet URL
                  </label>
                  <div className="flex gap-2">
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
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          Import
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                  {tweetUrl && !isValidUrl && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Please enter a valid X/Twitter URL
                    </p>
                  )}
                </div>

                {/* Success Message */}
                {successMessage && (
                  <Alert className="bg-green-500/10 border-green-500/50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-600">
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
                    <Bookmark className="h-4 w-4 mr-1" />
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
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Lightbulb className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No tweet imported yet</h3>
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
                <div className="text-center py-8 text-muted-foreground">
                  No history yet. Import a tweet to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReadaptHistory(item)}
                        >
                          Re-adapt
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bookmarks Tab */}
        <TabsContent value="bookmarks">
          <Card>
            <CardContent className="p-6">
              {bookmarks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No bookmarks yet. Bookmark inspiring tweets to save them for later.
                </div>
              ) : (
                <div className="space-y-4">
                  {bookmarks.map((bookmark) => (
                    <div
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
                            className="text-destructive"
                            onClick={() => handleDeleteBookmark(bookmark.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
