export interface VisibleRange {
  /** First visible row index (inclusive). */
  start: number;
  /** Last visible row index (exclusive). */
  end: number;
}

/** Row window to render for a fixed row height list, with `overscan` extra rows on each side. */
export function getVisibleRange(
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number,
  rowCount: number,
  overscan = 5,
): VisibleRange {
  if (rowCount <= 0 || rowHeight <= 0) return { start: 0, end: 0 };
  const first = Math.floor(Math.max(0, scrollTop) / rowHeight);
  const visible = Math.ceil(Math.max(0, viewportHeight) / rowHeight) + 1;
  const start = Math.max(0, first - overscan);
  const end = Math.min(rowCount, first + visible + overscan);
  return { start, end };
}
