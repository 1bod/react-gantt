export interface VisibleRange {
    /** First visible row index (inclusive). */
    start: number;
    /** Last visible row index (exclusive). */
    end: number;
}
/** Row window to render for a fixed row height list, with `overscan` extra rows on each side. */
export declare function getVisibleRange(scrollTop: number, viewportHeight: number, rowHeight: number, rowCount: number, overscan?: number): VisibleRange;
/** Cumulative offsets of variable height rows: `offsets[i]` is the top of row i, `offsets[n]` the total height. */
export declare function buildOffsets(heights: readonly number[]): number[];
/** Index of the row that contains `y` (binary search), clamped to the existing rows. -1 when there is none. */
export declare function findRowAt(offsets: readonly number[], y: number): number;
/** Same as `getVisibleRange` for variable row heights, described by their `offsets` (see `buildOffsets`). */
export declare function getVisibleRangeByOffsets(offsets: readonly number[], scrollTop: number, viewportHeight: number, overscan?: number): VisibleRange;
