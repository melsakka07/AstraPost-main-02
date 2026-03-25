/**
 * Returns the start and end Date of the current calendar month (local midnight).
 * Single source of truth used by require-plan, ai-quota, billing/usage, etc.
 */
export function getMonthWindow(): { start: Date; end: Date } {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  return { start, end };
}
