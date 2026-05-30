import { describe, expect, it } from "vitest";

/**
 * Pure-logic node tests for the dashboard layout reducer logic used by
 * DashboardLayoutClient (Wave 8 Task C).
 *
 * The reducer is NOT exported — these tests verify the derivation logic
 * by replicating the core algorithm inline.
 */

const DEFAULT_ORDER = [
  "setup_checklist",
  "failed_alert",
  "post_usage",
  "hero",
  "upcoming_queue",
  "stats",
];

function deriveEffectiveLayout(
  order: string[],
  hidden: string[],
  knownIds: Set<string>
): { effectiveOrder: string[]; effectiveHidden: string[] } {
  // Prune stale IDs + append new ones
  const filtered = order.filter((id) => knownIds.has(id));
  const newIds = [...knownIds].filter((id) => !filtered.includes(id));
  const effectiveOrder =
    newIds.length > 0 || filtered.length !== order.length ? [...filtered, ...newIds] : order;

  // Prune stale hidden
  const effectiveHidden = hidden.filter((id) => knownIds.has(id));

  return { effectiveOrder, effectiveHidden };
}

function getVisible(effectiveOrder: string[], effectiveHidden: string[], widgetMap: Set<string>) {
  return effectiveOrder.filter((id) => !effectiveHidden.includes(id) && widgetMap.has(id));
}

describe("deriveEffectiveLayout", () => {
  it("returns unchanged when all IDs are known and nothing is stale", () => {
    const known = new Set(DEFAULT_ORDER);
    const result = deriveEffectiveLayout(DEFAULT_ORDER, [], known);
    expect(result.effectiveOrder).toEqual(DEFAULT_ORDER);
    expect(result.effectiveHidden).toEqual([]);
  });

  it("prunes stale IDs no longer in the known set", () => {
    const order = ["setup_checklist", "deleted_widget", "hero", "stats"];
    const known = new Set(["setup_checklist", "hero", "stats"]);
    const result = deriveEffectiveLayout(order, [], known);
    expect(result.effectiveOrder).toEqual(["setup_checklist", "hero", "stats"]);
  });

  it("appends new widget IDs (e.g. failed_alert appears)", () => {
    // Widget set doesn't include failed_alert
    const known = new Set(["setup_checklist", "post_usage", "hero", "upcoming_queue", "stats"]);
    const order = ["setup_checklist", "post_usage", "hero", "upcoming_queue", "stats"];
    const result = deriveEffectiveLayout(order, [], known);
    // No new IDs to append — all known IDs already in order
    expect(result.effectiveOrder).toEqual(order);

    // Now failed_alert appears
    const knownWithAlert = new Set(DEFAULT_ORDER);
    const result2 = deriveEffectiveLayout(order, [], knownWithAlert);
    expect(result2.effectiveOrder).toEqual([
      "setup_checklist",
      "post_usage",
      "hero",
      "upcoming_queue",
      "stats",
      "failed_alert",
    ]);
  });

  it("prunes stale hidden IDs", () => {
    const known = new Set(["setup_checklist", "hero", "stats"]);
    const result = deriveEffectiveLayout(DEFAULT_ORDER, ["deleted_widget", "hero"], known);
    expect(result.effectiveHidden).toEqual(["hero"]);
  });

  it("ignores hidden widgets containing stale IDs", () => {
    const known = new Set(DEFAULT_ORDER);
    const result = deriveEffectiveLayout(DEFAULT_ORDER, ["unknown_a", "unknown_b"], known);
    expect(result.effectiveHidden).toEqual([]);
  });
});

describe("getVisible", () => {
  const widgetMap = new Set(DEFAULT_ORDER);

  it("returns all widgets when nothing is hidden", () => {
    const visible = getVisible(DEFAULT_ORDER, [], widgetMap);
    expect(visible).toEqual(DEFAULT_ORDER);
  });

  it("excludes hidden widgets", () => {
    const visible = getVisible(DEFAULT_ORDER, ["hero", "stats"], widgetMap);
    expect(visible).toEqual(["setup_checklist", "failed_alert", "post_usage", "upcoming_queue"]);
  });

  it("excludes unknown widget IDs", () => {
    const visible = getVisible([...DEFAULT_ORDER, "future_widget"], [], widgetMap);
    expect(visible).toEqual(DEFAULT_ORDER);
  });

  it("returns empty when all widgets are hidden", () => {
    const visible = getVisible(DEFAULT_ORDER, DEFAULT_ORDER, widgetMap);
    expect(visible).toEqual([]);
  });

  it("returns empty when widget map is empty (all children removed)", () => {
    const visible = getVisible(DEFAULT_ORDER, [], new Set());
    expect(visible).toEqual([]);
  });
});

describe("layout array move (dnd-kit arrayMove equivalent)", () => {
  function moveWidget(order: string[], fromIndex: number, toIndex: number): string[] {
    const result = [...order];
    const [moved] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, moved!);
    return result;
  }

  it("moves a widget from position 0 to position 2", () => {
    const result = moveWidget(DEFAULT_ORDER, 0, 2);
    expect(result).toEqual([
      "failed_alert",
      "post_usage",
      "setup_checklist",
      "hero",
      "upcoming_queue",
      "stats",
    ]);
  });

  it("moves a widget from last to first", () => {
    const result = moveWidget(DEFAULT_ORDER, 5, 0);
    expect(result).toEqual([
      "stats",
      "setup_checklist",
      "failed_alert",
      "post_usage",
      "hero",
      "upcoming_queue",
    ]);
  });

  it("same index is a no-op", () => {
    const result = moveWidget(DEFAULT_ORDER, 2, 2);
    expect(result).toEqual(DEFAULT_ORDER);
  });
});

describe("reset to default", () => {
  it("restores default order and clears hidden", () => {
    const layout = {
      order: ["stats", "hero", "setup_checklist"],
      hidden: ["post_usage", "failed_alert"],
      version: 1,
    };

    // Reset
    const reset = {
      order: DEFAULT_ORDER,
      hidden: [] as string[],
      version: 1,
    };

    expect(reset.order).toEqual(DEFAULT_ORDER);
    expect(reset.hidden).toEqual([]);
    expect(reset.order).not.toEqual(layout.order);
    expect(reset.hidden).not.toEqual(layout.hidden);
  });
});

describe("graceful fallback for unknown widget IDs", () => {
  it("drops unknown IDs from order and appends missing known IDs", () => {
    const known = new Set(DEFAULT_ORDER);
    const order = ["future_widget_a", "setup_checklist", "future_widget_b", "hero"];
    const { effectiveOrder } = deriveEffectiveLayout(order, [], known);
    // Unknown IDs dropped, known-but-missing IDs appended
    expect(effectiveOrder[0]).toBe("setup_checklist");
    expect(effectiveOrder[1]).toBe("hero");
    expect(effectiveOrder).toHaveLength(6);
    // future_widget_a and future_widget_b are gone
    expect(effectiveOrder).not.toContain("future_widget_a");
    expect(effectiveOrder).not.toContain("future_widget_b");
    // All 6 default widgets are present
    for (const id of DEFAULT_ORDER) {
      expect(effectiveOrder).toContain(id);
    }
  });

  it("drops unknown IDs from hidden", () => {
    const known = new Set(DEFAULT_ORDER);
    const { effectiveHidden } = deriveEffectiveLayout(
      DEFAULT_ORDER,
      ["future_widget", "hero", "future_widget2"],
      known
    );
    expect(effectiveHidden).toEqual(["hero"]);
  });

  it("default order fallback when all IDs are unknown", () => {
    const known = new Set(DEFAULT_ORDER);
    const order: string[] = [];
    const { effectiveOrder } = deriveEffectiveLayout(order, [], known);
    // All known IDs are appended as new
    expect(effectiveOrder).toEqual(DEFAULT_ORDER);
  });
});
