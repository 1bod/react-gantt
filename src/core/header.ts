import { DateTime, type DateTimeUnit } from 'luxon';
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

interface TierSpec {
  unit: DateTimeUnit;
  format: string;
}

const TIERS: Record<ZoomLevel, { top: TierSpec; bottom: TierSpec }> = {
  hour: { top: { unit: 'day', format: 'ccc d LLL yyyy' }, bottom: { unit: 'hour', format: 'HH:mm' } },
  day: { top: { unit: 'month', format: 'LLLL yyyy' }, bottom: { unit: 'day', format: 'd' } },
  week: { top: { unit: 'month', format: 'LLLL yyyy' }, bottom: { unit: 'week', format: 'd LLL' } },
  month: { top: { unit: 'year', format: 'yyyy' }, bottom: { unit: 'month', format: 'LLL' } },
};

function buildTier(range: TimeRange, spec: TierSpec, zone: string, locale?: string): HeaderTick[] {
  const ticks: HeaderTick[] = [];
  let cursor = DateTime.fromMillis(range.startMs, { zone, locale }).startOf(spec.unit);
  while (cursor.toMillis() < range.endMs) {
    const next = cursor.plus({ [spec.unit]: 1 });
    ticks.push({
      key: `${spec.unit}-${cursor.toMillis()}`,
      startMs: Math.max(cursor.toMillis(), range.startMs),
      endMs: Math.min(next.toMillis(), range.endMs),
      label: cursor.toFormat(spec.format),
    });
    cursor = next;
  }
  return ticks;
}

/** Two header tiers (e.g. months over days) clipped to the visible range. */
export function buildHeaderTicks(range: TimeRange, zoom: ZoomLevel, zone = 'local', locale?: string): HeaderTiers {
  const spec = TIERS[zoom];
  return {
    top: buildTier(range, spec.top, zone, locale),
    bottom: buildTier(range, spec.bottom, zone, locale),
  };
}
