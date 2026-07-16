"use client";

import Image from "next/image";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";

interface ImageContent {
  imageUrl?: string;
  model?: string;
  style?: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  predictionId?: string;
}

export function AiHistoryImagePreview({ content }: { content: ImageContent }) {
  const t = useTranslations("ai_history");
  const imageUrl = content.imageUrl;
  if (!imageUrl) return null;

  return (
    <div className="group bg-muted relative aspect-[4/3] max-h-[400px] w-full overflow-hidden rounded-lg">
      <Image
        src={imageUrl}
        alt={content.predictionId ?? "AI generated image"}
        fill
        className="object-contain"
        sizes="(max-width: 768px) 100vw, 400px"
        unoptimized
        loading="eager"
      />
      {/* Download overlay — visible on hover */}
      <a
        href={imageUrl}
        download
        className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100"
        aria-label={t("download_image")}
      >
        <span className="text-foreground inline-flex items-center gap-1.5 rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm transition-colors hover:bg-white">
          <Download className="h-3.5 w-3.5" />
          {t("download_image")}
        </span>
      </a>
    </div>
  );
}
