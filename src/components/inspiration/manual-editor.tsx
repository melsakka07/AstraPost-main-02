"use client";

import { useState, useCallback, useMemo } from "react";
import { AlertTriangle, CheckCircle2, Eraser } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ManualEditorProps {
  initialText?: string;
  sourceText: string;
  onChangeText?: (text: string) => void;
  onSendToComposer?: (text: string) => void;
  maxChars?: number;
}

// Levenshtein distance for similarity checking
function levenshteinDistance(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= bLen; i++) {
    const row: number[] = new Array(aLen + 1);
    row[0] = i;
    matrix[i] = row;
  }

  for (let j = 0; j <= aLen; j++) {
    matrix[0]![j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= bLen; i++) {
    const row = matrix[i]!;
    const prevRow = matrix[i - 1]!;

    for (let j = 1; j <= aLen; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        row[j] = prevRow[j - 1]!;
      } else {
        row[j] = Math.min(
          prevRow[j - 1]! + 1, // substitution
          row[j - 1]! + 1, // insertion
          prevRow[j]! + 1 // deletion
        );
      }
    }
  }

  return matrix[bLen]![aLen]!;
}

// Calculate similarity percentage (0-100)
function calculateSimilarity(text1: string, text2: string): number {
  const normalized1 = text1.toLowerCase().trim();
  const normalized2 = text2.toLowerCase().trim();

  if (normalized1.length === 0 || normalized2.length === 0) {
    return 0;
  }

  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);

  return Math.max(0, 100 - (distance / maxLength) * 100);
}

export function ManualEditor({
  initialText = "",
  sourceText,
  onChangeText,
  onSendToComposer,
  maxChars = 280,
}: ManualEditorProps) {
  const tm = useTranslations("inspiration");
  const [text, setText] = useState(initialText);

  const similarity = useMemo(() => calculateSimilarity(text, sourceText), [text, sourceText]);
  const charCount = text.length;
  const isOverLimit = charCount > maxChars;
  const isTooSimilar = similarity > 80;

  const handleChange = useCallback(
    (value: string) => {
      setText(value);
      onChangeText?.(value);
    },
    [onChangeText]
  );

  const handleSendToComposer = useCallback(() => {
    onSendToComposer?.(text);
  }, [text, onSendToComposer]);

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6">
        <CardTitle className="text-base sm:text-lg">{tm("manual.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-3 pt-0 sm:space-y-4 sm:p-6 sm:pt-0">
        {/* Character Counter */}
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <span className="text-muted-foreground text-xs sm:text-sm">
            {tm("manual.chars", { count: charCount, max: maxChars })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive h-7 gap-1 px-2 text-xs"
              onClick={() => handleChange("")}
              disabled={text === ""}
              aria-label={tm("manual.clear_text")}
              title={tm("manual.clear_text")}
            >
              <Eraser className="h-3.5 w-3.5" />
              {tm("manual.clear_text")}
            </Button>
            <span
              className={cn(
                "text-xs font-medium sm:text-sm",
                isOverLimit ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {tm("manual.remaining", { count: maxChars - charCount })}
            </span>
          </div>
        </div>

        {/* Text Area */}
        <Textarea
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={tm("manual.placeholder")}
          className="min-h-[120px] resize-none text-sm sm:min-h-[150px]"
        />

        {/* Similarity Warning */}
        {similarity > 50 && (
          <Alert
            variant={isTooSimilar ? "destructive" : "default"}
            className={cn(
              isTooSimilar
                ? "bg-destructive/10 border-destructive/50 text-destructive"
                : "bg-muted/50 border-muted"
            )}
          >
            {isTooSimilar ? (
              <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-yellow-600 sm:h-4 sm:w-4 dark:text-yellow-500" />
            )}
            <AlertDescription className="text-xs sm:text-sm">
              {isTooSimilar ? (
                <>{tm("manual.too_similar_description", { percent: Math.round(similarity) })}</>
              ) : (
                <>
                  {tm("manual.similarity_alert", {
                    percent: Math.round(similarity),
                    message:
                      similarity < 70 ? tm("manual.good_progress") : tm("manual.keep_editing"),
                  })}
                </>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-2 p-3 pt-0 sm:gap-3 sm:p-6 sm:pt-0">
        <span className="text-muted-foreground text-center text-[10px] sm:text-xs">
          {tm("manual.warning")}
        </span>
        <Button
          onClick={handleSendToComposer}
          disabled={isOverLimit || isTooSimilar || text.trim().length === 0}
          className="h-9 text-sm sm:h-10"
        >
          {tm("manual.send_to_composer")}
        </Button>
      </CardFooter>
    </Card>
  );
}
