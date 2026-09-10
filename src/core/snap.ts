import { DateTime } from 'luxon';
import type { SnapMode } from '../types';
import { DAY, HOUR, MINUTE } from './time';

export function snapUnitMs(snap: SnapMode): number {
  switch (snap) {
    case 'minute':
      return MINUTE;
    case 'hour':
      return HOUR;
    case 'day':
      return DAY;
    case 'none':
      return 0;
    default:
      return snap > 0 ? snap : 0;
  }
}

function nearestOf(ms: number, a: number, b: number): number {
  return ms - a < b - ms ? a : b;
}

/** Rounds `ms` to the nearest grid point. Hour and day grids are DST-safe (luxon). */
export function snapToGrid(ms: number, snap: SnapMode, zone = 'local'): number {
  if (snap === 'none') return ms;
  if (snap === 'hour' || snap === 'day') {
    const dt = DateTime.fromMillis(ms, { zone });
    const floor = dt.startOf(snap);
    const ceil = floor.plus({ [snap]: 1 });
    return nearestOf(ms, floor.toMillis(), ceil.toMillis());
  }
  const unit = snapUnitMs(snap);
  if (unit <= 0) return ms;
  return Math.round(ms / unit) * unit;
}

export interface EdgeMatch {
  edge: number;
  distance: number;
}

/** Closest value of `edges` within `thresholdMs` of `ms`, or `null`. */
export function nearestEdge(ms: number, edges: readonly number[], thresholdMs: number): EdgeMatch | null {
  let best: EdgeMatch | null = null;
  for (const edge of edges) {
    const distance = Math.abs(edge - ms);
    if (distance <= thresholdMs && (best === null || distance < best.distance)) {
      best = { edge, distance };
    }
  }
  return best;
}

export interface SnapContext {
  snap: SnapMode;
  /** Start/end instants of the other tasks, used as magnets. */
  edges: readonly number[];
  /** Magnet radius. Edges win over the grid when inside this radius. */
  edgeThresholdMs: number;
  zone?: string;
}

export type SnapSource = 'edge' | 'grid' | 'none';

export interface SnapResult {
  ms: number;
  source: SnapSource;
}

/** Snaps an instant: neighbouring task edges first, then the grid. */
export function snapTime(ms: number, ctx: SnapContext): SnapResult {
  const match = ctx.edgeThresholdMs > 0 ? nearestEdge(ms, ctx.edges, ctx.edgeThresholdMs) : null;
  if (match) return { ms: match.edge, source: 'edge' };
  if (ctx.snap === 'none') return { ms, source: 'none' };
  return { ms: snapToGrid(ms, ctx.snap, ctx.zone), source: 'grid' };
}
