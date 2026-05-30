"use client";

import { type Dispatch, type SetStateAction, useState } from "react";

export type InspirationTab = "import" | "history" | "bookmarks";

interface UseInspirationTabsResult {
  activeTab: InspirationTab;
  setActiveTab: Dispatch<SetStateAction<InspirationTab>>;
  successMessage: string | null;
  /** Show a success message that auto-dismisses after 3s. */
  showSuccess: (message: string) => void;
  /** Clear the success message immediately (e.g. on clear). */
  clearSuccess: () => void;
}

/**
 * Owns the active tab selection plus the auto-dismissing success message.
 * Behavior is identical to the inline state it replaced (3s dismiss).
 */
export function useInspirationTabs(): UseInspirationTabsResult {
  const [activeTab, setActiveTab] = useState<InspirationTab>("import");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const clearSuccess = () => setSuccessMessage(null);

  return { activeTab, setActiveTab, successMessage, showSuccess, clearSuccess };
}
