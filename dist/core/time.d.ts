import { DateTime } from 'luxon';
import type { DateInput, GanttTask, ZoomLevel } from '../types';
export declare const MINUTE = 60000;
export declare const HOUR: number;
export declare const DAY: number;
export declare const WEEK: number;
/** Average month, used only to derive a pixel density for the `month` zoom level. */
export declare const MONTH: number;
export declare const ZOOM_UNIT_MS: Record<ZoomLevel, number>;
export declare function toMs(input: DateInput): number;
export declare function toDateTime(ms: number, zone?: string): DateTime;
export interface TimeScale {
    startMs: number;
    endMs: number;
    pxPerMs: number;
}
export declare function createTimeScale(startMs: number, endMs: number, zoom: ZoomLevel, columnWidth: number): TimeScale;
export declare function msToPx(scale: TimeScale, ms: number): number;
export declare function pxToMs(scale: TimeScale, px: number): number;
export declare function scaleWidth(scale: TimeScale): number;
export interface TimeRange {
    startMs: number;
    endMs: number;
}
/**
 * Computes a timeline range covering every task (children included), padded by one
 * zoom unit on each side and aligned on unit boundaries.
 */
export declare function computeRange(tasks: readonly GanttTask[], zoom: ZoomLevel, zone?: string, now?: number): TimeRange;
export declare function clamp(value: number, min: number, max: number): number;
