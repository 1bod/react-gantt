import type { ClosedRange } from '../types';
export interface Interval {
    start: number;
    end: number;
}
/** Converts closed ranges to epoch milliseconds, dropping empty and inverted ones. */
export declare function toIntervals(ranges: readonly ClosedRange[]): Interval[];
/** Keeps the part of each interval inside [startMs, endMs]: only the visible window gets drawn. */
export declare function clipRanges(ranges: readonly Interval[], startMs: number, endMs: number): Interval[];
