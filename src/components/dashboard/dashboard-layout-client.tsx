"use client";

import { Children, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DASHBOARD_WIDGET_IDS } from "@/lib/schemas/common";
import { cn } from "@/lib/utils";
import type { DragEndEvent, Modifier } from "@dnd-kit/core";

// ─── Constants ───────────────────────────────────────────────────────────

// ─── Vertical-axis drag constraint (avoids @dnd-kit/modifiers dependency) ─

const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

// ─── Types ───────────────────────────────────────────────────────────────

interface DashboardLayoutClientProps {
  initialLayout: { order: string[]; hidden: string[]; version: number };
  children: ReactNode;
}

interface SortableDashboardWidgetProps {
  id: string;
  isEditing: boolean;
  onHide: (id: string) => void;
  children: ReactNode;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function extractWidgetMap(children: ReactNode): Map<string, ReactNode> {
  const map = new Map<string, ReactNode>();
  const arr = Children.toArray(children);
  for (const child of arr) {
    if (
      child &&
      typeof child === "object" &&
      "props" in child &&
      child.props &&
      typeof child.props === "object" &&
      "data-widget-id" in (child.props as Record<string, unknown>)
    ) {
      const id = (child.props as Record<string, unknown>)["data-widget-id"];
      if (typeof id === "string") {
        map.set(id, child);
      }
    }
  }
  return map;
}

// ─── Sortable Widget Wrapper ─────────────────────────────────────────────

function SortableDashboardWidget({
  id,
  isEditing,
  onHide,
  children,
}: SortableDashboardWidgetProps) {
  const t = useTranslations("dashboard");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 0,
    position: "relative" as const,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/widget relative">
      {isEditing && (
        <div className="border-border bg-card/95 absolute -top-1 right-1 z-20 flex items-center gap-0.5 rounded-lg border p-0.5 shadow-sm backdrop-blur">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={t("drag_handle_label")}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-md",
              "cursor-grab active:cursor-grabbing",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
              "touch-none"
            )}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onHide(id)}
            aria-label={t("hide_widget")}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-md",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
            )}
          >
            <EyeOff className="h-4 w-4" />
          </button>
        </div>
      )}
      {/* Slight highlight when editing to indicate the widget is mutable */}
      {isEditing && (
        <div className="border-border/60 pointer-events-none absolute inset-0 rounded-lg border-2 border-dashed" />
      )}
      {children}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

export function DashboardLayoutClient({ initialLayout, children }: DashboardLayoutClientProps) {
  const t = useTranslations("dashboard");
  // Derived widget labels from i18n (replaces hardcoded WIDGET_LABELS)
  const widgetLabels = useMemo(
    () =>
      DASHBOARD_WIDGET_IDS.reduce<Record<string, string>>((acc, id) => {
        acc[id] = t(`widget_labels.${id}` as Parameters<typeof t>[0]);
        return acc;
      }, {}),
    [t]
  );
  const widgetMap = useMemo(() => extractWidgetMap(children), [children]);

  // Seed state from initialLayout, filtered to known widget IDs
  const validInitialOrder = useMemo(
    () => initialLayout.order.filter((id) => widgetMap.has(id)),
    [initialLayout.order, widgetMap]
  );
  const validInitialHidden = useMemo(
    () => initialLayout.hidden.filter((id) => widgetMap.has(id)),
    [initialLayout.hidden, widgetMap]
  );

  const [isEditing] = useState(false);
  const [order, setOrder] = useState<string[]>(validInitialOrder);
  const [hidden, setHidden] = useState<string[]>(validInitialHidden);
  const announcementRef = useRef<HTMLDivElement>(null);

  // Derive effective order/hidden by pruning stale IDs and appending new ones
  // (children change when e.g. failed_alert appears/disappears based on failedCount)
  const { effectiveOrder, effectiveHidden } = useMemo(() => {
    const knownIds = new Set(widgetMap.keys());
    const filtered = order.filter((id) => knownIds.has(id));
    const newIds = [...knownIds].filter((id) => !filtered.includes(id));
    const effOrder =
      newIds.length > 0 || filtered.length !== order.length ? [...filtered, ...newIds] : order;
    const effHidden = hidden.filter((id) => knownIds.has(id));
    return { effectiveOrder: effOrder, effectiveHidden: effHidden };
  }, [order, hidden, widgetMap]);

  // Derived visible order (non-hidden, known widgets)
  const visible = useMemo(
    () => effectiveOrder.filter((id) => !effectiveHidden.includes(id) && widgetMap.has(id)),
    [effectiveOrder, effectiveHidden, widgetMap]
  );

  // Hidden widgets that are in the map
  const hiddenKnown = useMemo(
    () => effectiveHidden.filter((id) => widgetMap.has(id)),
    [effectiveHidden, widgetMap]
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ─── Screen-reader announcements ─────────────────────────────────────

  const announce = useCallback((message: string) => {
    const el = announcementRef.current;
    if (!el) return;
    el.textContent = "";
    requestAnimationFrame(() => {
      el.textContent = message;
    });
  }, []);

  // ─── Drag handler ────────────────────────────────────────────────────

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setOrder((prev) => {
        const oldIndex = prev.indexOf(String(active.id));
        const newIndex = prev.indexOf(String(over.id));
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
      announce(t("widget_moved"));
    },
    [announce, t]
  );

  // ─── Hide / Show ─────────────────────────────────────────────────────

  const handleHide = useCallback(
    (id: string) => {
      setHidden((prev) => (prev.includes(id) ? prev : [...prev, id]));
      announce(t("widget_hidden_announcement"));
    },
    [announce, t]
  );

  const handleShow = useCallback(
    (id: string) => {
      setHidden((prev) => prev.filter((h) => h !== id));
      announce(t("widget_shown_announcement"));
    },
    [announce, t]
  );

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <>
      {/* aria-live region for screen reader move/hide/show announcements */}
      <div ref={announcementRef} role="status" aria-live="polite" className="sr-only" />

      {/* Visible widgets — DnD-enabled when editing */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={visible} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-4 sm:gap-6">
            {visible.map((id) => (
              <SortableDashboardWidget key={id} id={id} isEditing={isEditing} onHide={handleHide}>
                {widgetMap.get(id)}
              </SortableDashboardWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Hidden widgets — only visible during edit mode */}
      {isEditing && hiddenKnown.length > 0 && (
        <div className="mt-6">
          <div className="mb-3">
            <h3 className="text-sm font-semibold">{t("hidden_widgets")}</h3>
            <p className="text-muted-foreground text-xs">{t("hidden_widgets_description")}</p>
          </div>
          <div className="flex flex-col gap-2">
            {hiddenKnown.map((id) => (
              <div
                key={id}
                className="border-border bg-muted/30 flex items-center justify-between rounded-lg border border-dashed px-4 py-2.5"
              >
                <span className="text-muted-foreground text-sm">{widgetLabels[id] ?? id}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleShow(id)}
                  aria-label={t("show_widget")}
                  className="h-9 gap-1.5"
                >
                  <Eye className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("show_widget")}</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
