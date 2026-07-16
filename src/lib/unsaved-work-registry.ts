/**
 * Lightweight global registry for tracking unsaved work across components.
 *
 * Components call `markDirty(key)` / `markClean(key)` in a useEffect keyed on
 * their dirty state. The language switcher checks `hasUnsaved()` before doing a
 * full-page reload — only showing a confirm dialog when there's actually
 * something to lose.
 *
 * Plain module (not Zustand) — no React dependency, no SSR concerns. The
 * language switcher reads it synchronously at click time, not reactively.
 * React Strict Mode safe because the cleanup function removes the key on
 * unmount before the second mount re-adds it.
 */

const dirtyKeys = new Set<string>();

export const unsavedWorkRegistry = {
  markDirty(key: string) {
    dirtyKeys.add(key);
  },
  markClean(key: string) {
    dirtyKeys.delete(key);
  },
  hasUnsaved(): boolean {
    return dirtyKeys.size > 0;
  },
};
