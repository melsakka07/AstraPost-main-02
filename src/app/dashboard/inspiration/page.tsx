"use client";

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bookmark, Download, History, Lightbulb, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { InspirationBookmarksList } from "@/components/inspiration/inspiration-bookmarks-list";
import { InspirationHistoryList } from "@/components/inspiration/inspiration-history-list";
import { InspirationImportPanel } from "@/components/inspiration/inspiration-import-panel";
import type { Bookmark as BookmarkType } from "@/components/inspiration/inspiration-types";
import { useInspirationBookmarks } from "@/components/inspiration/use-inspiration-bookmarks";
import { useInspirationComposerBridge } from "@/components/inspiration/use-inspiration-composer-bridge";
import { useInspirationHistory } from "@/components/inspiration/use-inspiration-history";
import { useInspirationImport } from "@/components/inspiration/use-inspiration-import";
import { useInspirationTabs } from "@/components/inspiration/use-inspiration-tabs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const tabs = useInspirationTabs();
  const history = useInspirationHistory();
  const importFlow = useInspirationImport({ t, recordImport: history.recordImport });
  const bookmarks = useInspirationBookmarks({
    t,
    setError: importFlow.setError,
    showSuccess: tabs.showSuccess,
  });
  const bridge = useInspirationComposerBridge({
    router,
    searchParams,
    tweetUrl: importFlow.tweetUrl,
    setTweetUrl: importFlow.setTweetUrl,
    setIsValidUrl: importFlow.setIsValidUrl,
    importedData: importFlow.importedData,
    setImportedData: importFlow.setImportedData,
  });

  // Clear imported tweet + URL and dismiss any success message.
  const handleClear = useCallback(() => {
    importFlow.handleClear();
    tabs.clearSuccess();
  }, [importFlow, tabs]);

  // Navigate to the Import tab (used by empty-state CTAs in History and Bookmarks).
  const handleNavigateToImport = useCallback(() => {
    tabs.setActiveTab("import");
  }, [tabs]);

  // History re-import: prefill the URL and switch to the import tab (no fetch —
  // matches the original button behavior).
  const handleHistoryReimport = useCallback(
    (url: string) => {
      importFlow.setTweetUrl(url);
      importFlow.setIsValidUrl(true);
      tabs.setActiveTab("import");
    },
    [importFlow, tabs]
  );

  // Bookmark re-adapt: re-import the source URL, then switch to the import tab.
  const handleReadaptBookmark = useCallback(
    async (bookmark: BookmarkType) => {
      const ok = await importFlow.reimportUrl(bookmark.sourceTweetUrl);
      if (ok) tabs.setActiveTab("import");
    },
    [importFlow, tabs]
  );

  return (
    <DashboardPageWrapper icon={Lightbulb} title={t("title")} description={t("description")}>
      <Tabs
        value={tabs.activeTab}
        onValueChange={(v) => tabs.setActiveTab(v as "import" | "history" | "bookmarks")}
        className="space-y-6"
      >
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

        <TabsContent value="import" className="space-y-6">
          <InspirationImportPanel
            tweetUrl={importFlow.tweetUrl}
            isValidUrl={importFlow.isValidUrl}
            isLoading={importFlow.isLoading}
            importElapsed={importFlow.importElapsed}
            importedData={importFlow.importedData}
            showThreadContext={importFlow.showThreadContext}
            error={importFlow.error}
            successMessage={tabs.successMessage}
            isBookmarking={bookmarks.isBookmarking}
            onUrlChange={importFlow.handleUrlChange}
            onImport={importFlow.handleImport}
            onBookmark={() =>
              bookmarks.handleBookmark(importFlow.importedData, importFlow.tweetUrl)
            }
            onClear={handleClear}
            onToggleThread={() => importFlow.setShowThreadContext(!importFlow.showThreadContext)}
            onSendToComposer={bridge.handleSendToComposer}
          />
        </TabsContent>

        <TabsContent value="history">
          <InspirationHistoryList
            history={history.history}
            onReimport={handleHistoryReimport}
            onNavigateToImport={handleNavigateToImport}
          />
        </TabsContent>

        <TabsContent value="bookmarks">
          <InspirationBookmarksList
            bookmarks={bookmarks.bookmarks}
            onReadapt={handleReadaptBookmark}
            onDelete={bookmarks.handleDeleteBookmark}
            onNavigateToImport={handleNavigateToImport}
          />
        </TabsContent>
      </Tabs>
    </DashboardPageWrapper>
  );
}
