"use client";

import { useState, useCallback, useMemo } from "react";
import { AlertTriangle, CheckCircle2, Eraser } from "lucide-react";
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
          row[j - 1]! + 1,     // insertion
          prevRow[j]! + 1      // deletion
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
  const [text, setText] = useState(initialText);

  const similarity = useMemo(() => calculateSimilarity(text, sourceText), [text, sourceText]);
  const charCount = text.length;
  const isOverLimit = charCount > maxChars;
  const isTooSimilar = similarity > 80;

  const handleChange = useCallback((value: string) => {
    setText(value);
    onChangeText?.(value);
  }, [onChangeText]);

  const handleSendToComposer = useCallback(() => {
    onSendToComposer?.(text);
  }, [text, onSendToComposer]);

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6">
        <CardTitle className="text-base sm:text-lg">Manual Editor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0 sm:pt-0">
        {/* Character Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs sm:text-sm text-muted-foreground">
            {charCount} / {maxChars} characters
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
              onClick={() => handleChange("")}
              disabled={text === ""}
              aria-label="Clear text"
              title="Clear text"
            >
              <Eraser className="h-3.5 w-3.5" />
              Clear
            </Button>
            <span
              className={cn(
                "text-xs sm:text-sm font-medium",
                isOverLimit ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {maxChars - charCount} remaining
            </span>
          </div>
        </div>

        {/* Text Area */}
        <Textarea
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Edit the tweet to make it your own..."
          className="min-h-[120px] sm:min-h-[150px] resize-none text-sm"
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
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-600 dark:text-yellow-500" />
            )}
            <AlertDescription className="text-xs sm:text-sm">
              {isTooSimilar ? (
                <>
                  <strong>Too similar!</strong> This content is {similarity.toFixed(0)}% similar to the
                  source. Please make more changes to create original content.
                </>
              ) : (
                <>
                  Similarity: {similarity.toFixed(0)}%. {similarity < 70 ? "Good progress!" : "Keep editing to add your unique voice."}
                </>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-6 pt-0 sm:pt-0">
        <span className="text-[10px] sm:text-xs text-muted-foreground text-center">
          Make substantial changes to create original content
        </span>
        <Button
          onClick={handleSendToComposer}
          disabled={isOverLimit || isTooSimilar || text.trim().length === 0}
          className="h-9 sm:h-10 text-sm"
        >
          Send to Composer
        </Button>
      </CardFooter>
    </Card>
  );
}
