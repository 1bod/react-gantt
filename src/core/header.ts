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

export const DEFAULT_HEADER_TIERS: Readonly<Record<ZoomLevel, HeaderTierSpecs>> = {
  hour: [
    { unit: 'day', format: 'ccc d LLL yyyy' },
    { unit: 'hour', format: 'HH:mm' },
  ],
  day: [
    { unit: 'month', format: 'LLLL yyyy' },
    { unit: 'day', format: 'd' },
  ],
  week: [
    { unit: 'month', format: 'LLLL yyyy' },
    { unit: 'week', format: 'd LLL' },
  ],
  month: [
    { unit: 'year', format: 'yyyy' },
    { unit: 'month', format: 'LLL' },
  ],
};

/** Field holding the unit's value and its first value, for the units a step can be aligned on. */
const STEP_FIELDS: Partial<Record<HeaderTierUnit, ['year' | 'month' | 'day' | 'hour' | 'minute', number]>> = {
  year: ['year', 0],
  month: ['month', 1],
  day: ['day', 1],
  hour: ['hour', 0],
  minute: ['minute', 0],
};

function alignToStep(dt: DateTime, unit: HeaderTierUnit, step: number): DateTime {
  const start = dt.startOf(unit);
  const field = STEP_FIELDS[unit];
  if (step <= 1 || !field) return start;
  const [name, first] = field;
  return start.set({ [name]: Math.floor((start.get(name) - first) / step) * step + first });
}

function nextTick(cursor: DateTime, unit: HeaderTierUnit, step: number): DateTime {
  if (step <= 1) return cursor.plus({ [unit]: 1 });
  // Re-align after each step so that DST changes never shift the grid (00, 06, 12, 18).
  let candidate = cursor.plus({ [unit]: step });
  let aligned = alignToStep(candidate, unit, step);
  while (aligned.toMillis() <= cursor.toMillis()) {
    candidate = candidate.plus({ [unit]: 1 });
    aligned = alignToStep(candidate, unit, step);
  }
  return aligned;
}

function buildTier(range: TimeRange, spec: HeaderTierSpec, zone: string, locale?: string): HeaderTick[] {
  const ticks: HeaderTick[] = [];
  const step = Math.max(1, Math.floor(spec.step ?? 1));
  let cursor = alignToStep(DateTime.fromMillis(range.startMs, { zone, locale }), spec.unit, step);
  while (cursor.toMillis() < range.endMs) {
    const next = nextTick(cursor, spec.unit, step);
    ticks.push({
      key: `${spec.unit}-${cursor.toMillis()}`,
      startMs: Math.max(cursor.toMillis(), range.startMs),
      endMs: Math.min(next.toMillis(), range.endMs),
      label: typeof spec.format === 'string' ? cursor.toFormat(spec.format) : spec.format(cursor),
    });
    cursor = next;
  }
  return ticks;
}

/**
 * Two header tiers (e.g. months over days) clipped to the visible range. `tiers` overrides
 * the default tiers of the zoom level (see `DEFAULT_HEADER_TIERS`).
 */
export function buildHeaderTicks(
  range: TimeRange,
  zoom: ZoomLevel,
  zone = 'local',
  locale?: string,
  tiers: HeaderTierSpecs = DEFAULT_HEADER_TIERS[zoom],
): HeaderTiers {
  return {
    top: buildTier(range, tiers[0], zone, locale),
    bottom: buildTier(range, tiers[1], zone, locale),
  };
}
