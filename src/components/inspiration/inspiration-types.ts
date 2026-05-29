export interface Bookmark {
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

export interface HistoryItem {
  id: string;
  sourceTweetId: string;
  sourceTweetUrl: string;
  sourceAuthorHandle: string;
  sourceText: string;
  action: string | null;
  createdAt: string;
}
