import { DateTime } from 'luxon';
import type { SnapMode } from '../types';
import { clamp, HOUR, type TimeScale } from './time';
import { nearestEdge, snapTime, snapToGrid, snapUnitMs, type SnapContext, type SnapSource } from './snap';
import { findRowAt } from './virtual';

export type DragKind = 'move' | 'resize-start' | 'resize-end';

export interface DragInput {
  kind: DragKind;
  originStart: number;
  originEnd: number;
  /** Horizontal pointer displacement in pixels since the drag started. */
  deltaPx: number;
  /** Vertical pointer displacement in pixels since the drag started. */
  deltaY: number;
  originRowIndex: number;
  rowCount: number;
  rowHeight: number;
  scale: TimeScale;
  snap: SnapContext;
  minDurationMs: number;
  allowVertical: boolean;
  /**
   * Variable row heights (resource mode): `rowTops[i]` is the top of row i and
   * `rowTops[rowCount]` the total height. Used with `anchorY` instead of `rowHeight`.
   */
  rowTops?: readonly number[];
  /** With `rowTops`: vertical position of the dragged bar's centre when the drag started. */
  anchorY?: number;
}

export interface DragResult {
  start: number;
  end: number;
  rowIndex: number;
  snappedTo: SnapSource;
}

/**
 * Pure drag resolver. Given the pointer displacement since the drag started, computes
 * the resulting task interval and row.
 *
 * - `move` keeps the duration. The bar is magnetised by whichever of its two edges is
 *   closest to a neighbouring edge, otherwise its start is snapped to the grid.
 * - `resize-*` snaps the moving edge and never lets the task shrink below `minDurationMs`.
 */
export function computeDrag(input: DragInput): DragResult {
  const { kind, originStart, originEnd, scale, snap, minDurationMs } = input;
  const deltaMs = input.deltaPx / scale.pxPerMs;
  const duration = originEnd - originStart;

  let rowIndex = input.originRowIndex;
  if (input.allowVertical && kind === 'move' && input.rowCount > 0 && input.rowTops && input.anchorY !== undefined) {
    rowIndex = clamp(findRowAt(input.rowTops, input.anchorY + input.deltaY), 0, input.rowCount - 1);
  } else if (input.allowVertical && kind === 'move' && input.rowCount > 0) {
    const ratio = input.deltaY / input.rowHeight;
    // Symmetric rounding: Math.round(-0.5) is 0 in JS, we want -1.
    const deltaRows = Math.sign(ratio) * Math.round(Math.abs(ratio));
    rowIndex = clamp(input.originRowIndex + deltaRows, 0, input.rowCount - 1);
  }

  if (kind === 'move') {
    const rawStart = originStart + deltaMs;
    const rawEnd = originEnd + deltaMs;
    const startMatch = snap.edgeThresholdMs > 0 ? nearestEdge(rawStart, snap.edges, snap.edgeThresholdMs) : null;
    const endMatch = snap.edgeThresholdMs > 0 ? nearestEdge(rawEnd, snap.edges, snap.edgeThresholdMs) : null;
    let best: { start: number; source: SnapSource } | null = null;
    if (startMatch && (!endMatch || startMatch.distance <= endMatch.distance)) {
      best = { start: startMatch.edge, source: 'edge' };
    } else if (endMatch) {
      best = { start: endMatch.edge - duration, source: 'edge' };
    }
    if (!best) {
      const snapped = snapTime(rawStart, { ...snap, edges: [] });
      best = { start: snapped.ms, source: snapped.source };
    }
    return { start: best.start, end: best.start + duration, rowIndex, snappedTo: best.source };
  }

  if (kind === 'resize-start') {
    const raw = originStart + deltaMs;
    const snapped = snapTime(raw, snap);
    const maxStart = originEnd - minDurationMs;
    if (snapped.ms > maxStart) {
      return { start: maxStart, end: originEnd, rowIndex, snappedTo: 'none' };
    }
    return { start: snapped.ms, end: originEnd, rowIndex, snappedTo: snapped.source };
  }

  const raw = originEnd + deltaMs;
  const snapped = snapTime(raw, snap);
  const minEnd = originStart + minDurationMs;
  if (snapped.ms < minEnd) {
    return { start: originStart, end: minEnd, rowIndex, snappedTo: 'none' };
  }
  return { start: originStart, end: snapped.ms, rowIndex, snappedTo: snapped.source };
}

export type KeyboardAction = 'move' | 'resize-start' | 'resize-end';

export interface KeyboardStepInput {
  action: KeyboardAction;
  direction: -1 | 1;
  start: number;
  end: number;
  snap: SnapMode;
  minDurationMs: number;
  zone?: string;
}

/** Shifts one edge (or the whole task) by one snap unit. `none` falls back to one hour. */
export function computeKeyboardStep(input: KeyboardStepInput): { start: number; end: number } {
  const { action, direction, start, end, snap, minDurationMs } = input;
  const zone = input.zone ?? 'local';
  const stepMs = snapUnitMs(snap) || HOUR;

  const shift = (ms: number): number => {
    if (snap === 'hour' || snap === 'day') {
      const aligned = snapToGrid(ms, snap, zone);
      const dt = DateTime.fromMillis(ms, { zone });
      // Already on the grid: move a full unit. Otherwise land on the next grid point.
      if (aligned === ms) return dt.plus({ [snap]: direction }).toMillis();
      return direction > 0 ? dt.startOf(snap).plus({ [snap]: 1 }).toMillis() : dt.startOf(snap).toMillis();
    }
    if (snap === 'none') return ms + direction * stepMs;
    const onGrid = Math.round(ms / stepMs) * stepMs === ms;
    if (onGrid) return ms + direction * stepMs;
    return direction > 0 ? Math.ceil(ms / stepMs) * stepMs : Math.floor(ms / stepMs) * stepMs;
  };

  if (action === 'move') {
    const nextStart = shift(start);
    return { start: nextStart, end: nextStart + (end - start) };
  }
  if (action === 'resize-start') {
    const nextStart = Math.min(shift(start), end - minDurationMs);
    return { start: nextStart, end };
  }
  const nextEnd = Math.max(shift(end), start + minDurationMs);
  return { start, end: nextEnd };
}
