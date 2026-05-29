"use client";

import { type ReactNode, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import twitter from "twitter-text";
import type { XSubscriptionTier } from "@/lib/schemas/common";
import { getMaxCharacterLimit, canPostLongContent } from "@/lib/services/x-subscription";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TweetEditorItem {
  id: string;
  content: string;
}

export interface TweetEditorSlotProps<T extends TweetEditorItem> {
  item: T;
  index: number;
  total: number;
  charCount: number;
  maxChars: number;
  isOverLimit: boolean;
  isOverStandardLimit: boolean;
  isPremiumSinglePost: boolean;
  lengthZone: string | null;
  /** Ready-to-spread props for a drag handle button */
  dragHandleProps: React.HTMLAttributes<HTMLButtonElement>;
  isDragging: boolean;
  /** Keyboard-only reorder (chevron buttons) */
  onMoveUp?: (() => void) | undefined;
  onMoveDown?: (() => void) | undefined;
}

interface TweetEditorListProps<T extends TweetEditorItem> {
  items: T[];
  sortablePrefix?: string;
  tier?: XSubscriptionTier | undefined;
  forceThreadMode?: boolean;
  className?: string;
  children: (props: TweetEditorSlotProps<T>) => ReactNode;
  renderInsertBetween?: ((afterIndex: number) => ReactNode) | undefined;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getCharCount(text: string): number {
  return twitter.parseTweet(text).weightedLength;
}

function getLengthZoneLabel(charCount: number, isPremiumSinglePost: boolean): string | null {
  if (!isPremiumSinglePost) return null;
  if (charCount <= 280) return "length_zone.short";
  if (charCount <= 1_000) return "length_zone.medium";
  return "length_zone.long";
}

function sortableId(prefix: string, itemId: string): string {
  return `${prefix}-${itemId}`;
}

// ── Sortable item wrapper ──────────────────────────────────────────────────────

function SortableItem<T extends TweetEditorItem>({
  item,
  index,
  total,
  prefix,
  tier,
  isThreadMode,
  onMoveUp,
  onMoveDown,
  children,
}: {
  item: T;
  index: number;
  total: number;
  prefix: string;
  tier?: XSubscriptionTier | undefined;
  isThreadMode: boolean;
  onMoveUp?: (() => void) | undefined;
  onMoveDown?: (() => void) | undefined;
  children: (props: TweetEditorSlotProps<T>) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId(prefix, item.id),
  });

  const dndStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const maxChars = isThreadMode ? 280 : getMaxCharacterLimit(tier);
  const charCount = getCharCount(item.content);
  const isOverLimit = charCount > maxChars;
  const isOverStandardLimit = charCount > 280;
  const isPremiumSinglePost = !isThreadMode && canPostLongContent(tier);

  return (
    <div ref={setNodeRef} style={dndStyle} className={isDragging ? "opacity-50" : ""}>
      {children({
        item,
        index,
        total,
        charCount,
        maxChars,
        isOverLimit,
        isOverStandardLimit,
        isPremiumSinglePost,
        lengthZone: getLengthZoneLabel(charCount, isPremiumSinglePost),
        dragHandleProps: { ...attributes, ...listeners },
        isDragging,
        ...(onMoveUp != null ? { onMoveUp } : {}),
        ...(onMoveDown != null ? { onMoveDown } : {}),
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function TweetEditorList<T extends TweetEditorItem>({
  items,
  sortablePrefix = "tel",
  tier,
  forceThreadMode = false,
  className,
  children,
  renderInsertBetween,
  onReorder,
}: TweetEditorListProps<T>) {
  const isThreadMode = forceThreadMode || items.length > 1;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const fromIndex = items.findIndex(
        (item) => sortableId(sortablePrefix, item.id) === active.id
      );
      const toIndex = items.findIndex((item) => sortableId(sortablePrefix, item.id) === over.id);

      if (fromIndex !== -1 && toIndex !== -1) {
        onReorder(fromIndex, toIndex);
      }
    },
    [items, sortablePrefix, onReorder]
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={items.map((item) => sortableId(sortablePrefix, item.id))}
        strategy={verticalListSortingStrategy}
      >
        <div className={className}>
          {items.map((item, index) => (
            <div key={sortableId(sortablePrefix, item.id)}>
              <SortableItem<T>
                item={item}
                index={index}
                total={items.length}
                prefix={sortablePrefix}
                tier={tier}
                isThreadMode={isThreadMode}
                onMoveUp={index > 0 ? () => onReorder(index, index - 1) : undefined}
                onMoveDown={
                  index < items.length - 1 ? () => onReorder(index, index + 1) : undefined
                }
              >
                {children}
              </SortableItem>
              {renderInsertBetween?.(index)}
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
