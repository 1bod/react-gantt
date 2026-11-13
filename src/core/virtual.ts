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

/** Cumulative offsets of variable height rows: `offsets[i]` is the top of row i, `offsets[n]` the total height. */
export function buildOffsets(heights: readonly number[]): number[] {
  const offsets = [0];
  let top = 0;
  for (const height of heights) {
    top += height;
    offsets.push(top);
  }
  return offsets;
}

/** Index of the row that contains `y` (binary search), clamped to the existing rows. -1 when there is none. */
export function findRowAt(offsets: readonly number[], y: number): number {
  const count = offsets.length - 1;
  if (count <= 0) return -1;
  let low = 0;
  let high = count - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (offsets[mid]! <= y) low = mid;
    else high = mid - 1;
  }
  return low;
}

/** Same as `getVisibleRange` for variable row heights, described by their `offsets` (see `buildOffsets`). */
export function getVisibleRangeByOffsets(
  offsets: readonly number[],
  scrollTop: number,
  viewportHeight: number,
  overscan = 5,
): VisibleRange {
  const count = offsets.length - 1;
  if (count <= 0) return { start: 0, end: 0 };
  const top = Math.max(0, scrollTop);
  const first = findRowAt(offsets, top);
  const last = findRowAt(offsets, top + Math.max(0, viewportHeight));
  return { start: Math.max(0, first - overscan), end: Math.min(count, last + 1 + overscan) };
}
