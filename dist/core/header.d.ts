import { DateTime } from 'luxon';
import type { ZoomLevel } from '../types';
import type { TimeRange } from './time';
export interface HeaderTick {
    key: string;
    startMs: number;
    endMs: number;
    label: string;
}
export interface HeaderTiers {
    top: HeaderTick[];
    bottom: HeaderTick[];
}
export type HeaderTierUnit = 'year' | 'quarter' | 'month' | 'week' | 'day' | 'hour' | 'minute';
export interface HeaderTierSpec {
    unit: HeaderTierUnit;
    /**
     * Units per cell, aligned on the parent unit: `{ unit: 'hour', step: 6 }` gives 00:00,
     * 06:00, 12:00, 18:00 every day. Default `1`.
     */
    step?: number;
    /** Luxon format string, or a function of the cell start (zone and locale applied). */
    format: string | ((start: DateTime) => string);
}
/** Top tier, bottom tier. */
export type HeaderTierSpecs = [top: HeaderTierSpec, bottom: HeaderTierSpec];
export declare const DEFAULT_HEADER_TIERS: Readonly<Record<ZoomLevel, HeaderTierSpecs>>;
/**
 * Two header tiers (e.g. months over days) clipped to the visible range. `tiers` overrides
 * the default tiers of the zoom level (see `DEFAULT_HEADER_TIERS`).
 */
export declare function buildHeaderTicks(range: TimeRange, zoom: ZoomLevel, zone?: string, locale?: string, tiers?: HeaderTierSpecs): HeaderTiers;
