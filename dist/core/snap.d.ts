import type { SnapMode } from '../types';
export declare function snapUnitMs(snap: SnapMode): number;
/** Rounds `ms` to the nearest grid point. Hour and day grids are DST-safe (luxon). */
export declare function snapToGrid(ms: number, snap: SnapMode, zone?: string): number;
export interface EdgeMatch {
    edge: number;
    distance: number;
}
/** Closest value of `edges` within `thresholdMs` of `ms`, or `null`. */
export declare function nearestEdge(ms: number, edges: readonly number[], thresholdMs: number): EdgeMatch | null;
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
export declare function snapTime(ms: number, ctx: SnapContext): SnapResult;
