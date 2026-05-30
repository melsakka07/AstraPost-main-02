"use client";

import { type Dispatch, type RefObject, type SetStateAction, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { TweetDraft } from "@/components/composer/composer-types";
import type { MediaLibraryItem } from "@/components/composer/media-library-picker";
import { clientLogger } from "@/lib/client-logger";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface UseComposerMediaArgs {
  tweets: TweetDraft[];
  setTweets: Dispatch<SetStateAction<TweetDraft[]>>;
  activeTweetId: string | null;
  setActiveTweetId: Dispatch<SetStateAction<string | null>>;
  fileInputRef: RefObject<HTMLInputElement | null>;
}

export function useComposerMedia({
  tweets,
  setTweets,
  activeTweetId,
  setActiveTweetId,
  fileInputRef,
}: UseComposerMediaArgs) {
  const t = useTranslations("compose");

  // AI Image Dialog State
  const [isAiImageOpen, setIsAiImageOpen] = useState(false);
  const [aiImageTargetTweetId, setAiImageTargetTweetId] = useState<string | null>(null);

  // Media Library Dialog State
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  const openAiImageDialog = (tweetId: string) => {
    setAiImageTargetTweetId(tweetId);
    setIsAiImageOpen(true);
  };

  const openMediaLibrary = (tweetId: string) => {
    setActiveTweetId(tweetId);
    setIsLibraryOpen(true);
  };

  const closeMediaLibrary = () => {
    setIsLibraryOpen(false);
  };

  const handleLibrarySelect = (item: MediaLibraryItem) => {
    if (!activeTweetId) return;

    // Determine MIME type from fileType
    const mimeType =
      item.fileType === "video" ? "video/mp4" : item.fileType === "gif" ? "image/gif" : "image/png";

    setTweets((prev) =>
      prev.map((tweet) => {
        if (tweet.id === activeTweetId) {
          const currentMediaCount = tweet.media.length;
          if (currentMediaCount >= 4) {
            toast.error(t("toasts.max_media"));
            return tweet;
          }
          return {
            ...tweet,
            media: [
              ...tweet.media,
              {
                url: item.fileUrl,
                mimeType,
                fileType: item.fileType as "image" | "video" | "gif",
                size: item.fileSize,
              },
            ],
          };
        }
        return tweet;
      })
    );

    setIsLibraryOpen(false);
  };

  const handleAiImageAttach = (image: {
    imageUrl: string;
    width: number;
    height: number;
    model: string;
    prompt: string;
  }) => {
    if (!aiImageTargetTweetId) return;

    // Add image to the tweet's media array
    setTweets((prev) =>
      prev.map((tweet) => {
        if (tweet.id === aiImageTargetTweetId) {
          const currentMediaCount = tweet.media.length;
          if (currentMediaCount >= 4) {
            toast.error(t("toasts.max_images"));
            return tweet; // return unchanged
          }
          return {
            ...tweet,
            media: [
              ...tweet.media,
              {
                url: image.imageUrl,
                mimeType: "image/png",
                fileType: "image" as const,
                size: 0, // Will be determined on upload
              },
            ],
          };
        }
        return tweet;
      })
    );
    // Dialog stays open — user can generate and attach more images (up to 4)
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !activeTweetId) return;
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const tweetId = activeTweetId;
    const existingCount = tweets.find((t) => t.id === tweetId)?.media.length ?? 0;
    const remaining = Math.max(0, 4 - existingCount);
    const toUpload = files.slice(0, remaining);

    if (fileInputRef.current) fileInputRef.current.value = "";

    if (toUpload.length === 0) {
      toast.error(t("toasts.max_media"));
      return;
    }

    // Add placeholder spinner items immediately so the user sees feedback
    const placeholders: TweetDraft["media"] = toUpload.map((file) => ({
      url: "",
      mimeType: file.type,
      fileType: (file.type.startsWith("video/")
        ? "video"
        : file.type === "image/gif"
          ? "gif"
          : "image") as "image" | "video" | "gif",
      size: file.size,
      uploading: true,
      placeholderId: Math.random().toString(36).slice(2, 11),
    }));

    setTweets((prev) =>
      prev.map((tw) => (tw.id === tweetId ? { ...tw, media: [...tw.media, ...placeholders] } : tw))
    );

    let successCount = 0;
    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i]!;
      const { placeholderId } = placeholders[i]!;
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetchWithAuth("/api/media/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const msg = await res.text().catch(() => "Upload failed");
          throw new Error(msg || "Upload failed");
        }
        const data = await res.json();
        // Replace placeholder with real media item
        setTweets((prev) =>
          prev.map((tw) =>
            tw.id === tweetId
              ? {
                  ...tw,
                  media: tw.media.map((m) =>
                    m.placeholderId === placeholderId
                      ? {
                          url: data.url,
                          mimeType: data.mimeType,
                          fileType: data.fileType,
                          size: data.size,
                        }
                      : m
                  ),
                }
              : tw
          )
        );
        // Show optimization hint if the server provided one
        if (data.optimizationHint) {
          toast.info(data.optimizationHint);
        }
        successCount++;
      } catch (error) {
        clientLogger.error("File upload failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        // Remove failed placeholder
        setTweets((prev) =>
          prev.map((tw) =>
            tw.id === tweetId
              ? { ...tw, media: tw.media.filter((m) => m.placeholderId !== placeholderId) }
              : tw
          )
        );
        toast.error(error instanceof Error ? error.message : "Failed to upload file");
      }
    }

    if (successCount > 0) {
      toast.success(successCount === 1 ? "Media uploaded" : `${successCount} files uploaded`);
    }
  };

  const triggerFileUpload = (tweetId: string) => {
    setActiveTweetId(tweetId);
    fileInputRef.current?.click();
  };

  return {
    isAiImageOpen,
    setIsAiImageOpen,
    aiImageTargetTweetId,
    openAiImageDialog,
    handleAiImageAttach,
    handleFileUpload,
    triggerFileUpload,
    isLibraryOpen,
    openMediaLibrary,
    closeMediaLibrary,
    handleLibrarySelect,
  };
}
