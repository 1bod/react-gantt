import type { ClosedRange } from '../types';
import { toMs } from './time';

export interface Interval {
  start: number;
  end: number;
}

/** Converts closed ranges to epoch milliseconds, dropping empty and inverted ones. */
export function toIntervals(ranges: readonly ClosedRange[]): Interval[] {
  const intervals: Interval[] = [];
  for (const range of ranges) {
    const start = toMs(range.start);
    const end = toMs(range.end);
    if (end > start) intervals.push({ start, end });
  }
  return intervals;
}

/** Keeps the part of each interval inside [startMs, endMs]: only the visible window gets drawn. */
export function clipRanges(ranges: readonly Interval[], startMs: number, endMs: number): Interval[] {
  const clipped: Interval[] = [];
  for (const range of ranges) {
    const start = Math.max(range.start, startMs);
    const end = Math.min(range.end, endMs);
    if (end > start) clipped.push({ start, end });
  }
  return clipped;
}
