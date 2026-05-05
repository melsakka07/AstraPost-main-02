"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────────────────

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

// ── Magic byte check ───────────────────────────────────────────────────

function isPdfByMagicBytes(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const bytes = new Uint8Array(buffer);
  return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

// ── Props ──────────────────────────────────────────────────────────────

interface PdfDropzoneProps {
  onFileSelected: (file: File) => void;
  disabled: boolean;
}

// ── Component ──────────────────────────────────────────────────────────

export function PdfDropzone({ onFileSelected, disabled }: PdfDropzoneProps) {
  const t = useTranslations("ai_hub");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndAccept = useCallback(
    async (file: File) => {
      // Size check
      if (file.size > MAX_FILE_BYTES) {
        toast.error(t("pdf_to_thread.dropzone.file_too_large"));
        return;
      }

      // Extension check
      const isPdfName = file.name.toLowerCase().endsWith(".pdf");
      const isPdfType = file.type === "application/pdf";

      if (!isPdfName && !isPdfType) {
        toast.error(t("pdf_to_thread.dropzone.invalid_type"));
        return;
      }

      // Magic byte check
      setIsValidating(true);
      try {
        const buffer = await readFileHeader(file, 4);
        if (!isPdfByMagicBytes(buffer)) {
          toast.error(t("pdf_to_thread.dropzone.not_valid_pdf"));
          return;
        }
        onFileSelected(file);
      } catch {
        toast.error(t("pdf_to_thread.errors.generic"));
      } finally {
        setIsValidating(false);
      }
    },
    [onFileSelected, t]
  );

  // ── Drag handlers ──────────────────────────────────────────────────

  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        e.dataTransfer.dropEffect = "copy";
      }
    },
    [disabled]
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length === 0) return;
      const file = files[0];
      if (!file) return;
      void validateAndAccept(file);
    },
    [disabled, validateAndAccept]
  );

  // ── Click handler ──────────────────────────────────────────────────

  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;
    void validateAndAccept(file);
    // Reset input so the same file can be re-uploaded after a back action
    e.target.value = "";
  };

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={t("pdf_to_thread.dropzone.click_to_upload")}
      aria-disabled={disabled || isValidating}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        "border-border bg-background hover:border-brand-8 hover:bg-brand-3/30 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors",
        "min-h-[200px] cursor-pointer",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        isDragOver && "border-brand-8 bg-brand-3/40 border-solid",
        (disabled || isValidating) && "pointer-events-none opacity-50"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleFileInputChange}
        aria-hidden="true"
      />

      {isValidating ? (
        <>
          <Upload className="text-muted-foreground h-10 w-10 animate-pulse" />
          <p className="text-muted-foreground text-sm font-medium">
            {t("pdf_to_thread.dropzone.uploading")}
          </p>
        </>
      ) : isDragOver ? (
        <>
          <Upload className="text-brand-9 h-10 w-10" />
          <p className="text-brand-9 text-sm font-semibold">
            {t("pdf_to_thread.dropzone.drag_active")}
          </p>
        </>
      ) : (
        <>
          <div className="bg-brand-3 text-brand-9 flex h-12 w-12 items-center justify-center rounded-full">
            <Upload className="h-6 w-6" />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-foreground text-sm font-semibold">
              {t("pdf_to_thread.dropzone.click_to_upload")}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("pdf_to_thread.dropzone.supported_formats")}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

function readFileHeader(file: File, byteCount: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file header"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file.slice(0, byteCount));
  });
}
