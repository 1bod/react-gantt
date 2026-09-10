import { DateTime } from 'luxon';
import type { DateInput, GanttTask, ZoomLevel } from '../types';

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;
/** Average month, used only to derive a pixel density for the `month` zoom level. */
export const MONTH = 30.4375 * DAY;

export const ZOOM_UNIT_MS: Record<ZoomLevel, number> = {
  hour: HOUR,
  day: DAY,
  week: WEEK,
  month: MONTH,
};

export function toMs(input: DateInput): number {
  if (input instanceof Date) return input.getTime();
  if (typeof input === 'number') return input;
  if (typeof input === 'string') {
    const dt = DateTime.fromISO(input);
    if (!dt.isValid) throw new Error(`react-gantt: invalid ISO date "${input}"`);
    return dt.toMillis();
  }
  if (DateTime.isDateTime(input)) return input.toMillis();
  throw new Error('react-gantt: unsupported date input');
}

export function toDateTime(ms: number, zone = 'local'): DateTime {
  return DateTime.fromMillis(ms, { zone });
}

export interface TimeScale {
  startMs: number;
  endMs: number;
  pxPerMs: number;
}

export function createTimeScale(
  startMs: number,
  endMs: number,
  zoom: ZoomLevel,
  columnWidth: number,
): TimeScale {
  return { startMs, endMs, pxPerMs: columnWidth / ZOOM_UNIT_MS[zoom] };
}

export function msToPx(scale: TimeScale, ms: number): number {
  return (ms - scale.startMs) * scale.pxPerMs;
}

export function pxToMs(scale: TimeScale, px: number): number {
  return scale.startMs + px / scale.pxPerMs;
}

export function scaleWidth(scale: TimeScale): number {
  return msToPx(scale, scale.endMs);
}

export interface TimeRange {
  startMs: number;
  endMs: number;
}

const ZOOM_LUXON_UNIT: Record<ZoomLevel, 'hour' | 'day' | 'week' | 'month'> = {
  hour: 'hour',
  day: 'day',
  week: 'week',
  month: 'month',
};

/**
 * Computes a timeline range covering every task (children included), padded by one
 * zoom unit on each side and aligned on unit boundaries.
 */
export function computeRange(
  tasks: readonly GanttTask[],
  zoom: ZoomLevel,
  zone = 'local',
  now: number = Date.now(),
): TimeRange {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  const visit = (task: GanttTask) => {
    min = Math.min(min, toMs(task.start));
    max = Math.max(max, toMs(task.end));
    task.children?.forEach(visit);
  };
  tasks.forEach(visit);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = now;
    max = now + 7 * ZOOM_UNIT_MS[zoom];
  }
  const unit = ZOOM_LUXON_UNIT[zoom];
  const startMs = DateTime.fromMillis(min, { zone }).startOf(unit).minus({ [unit]: 1 }).toMillis();
  const endMs = DateTime.fromMillis(max, { zone })
    .startOf(unit)
    .plus({ [unit]: 2 })
    .toMillis();
  return { startMs, endMs };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
