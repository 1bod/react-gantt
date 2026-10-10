import type { SnapMode } from '../types';
import { type TimeScale } from './time';
import { type SnapContext, type SnapSource } from './snap';
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
export declare function computeDrag(input: DragInput): DragResult;
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
export declare function computeKeyboardStep(input: KeyboardStepInput): {
    start: number;
    end: number;
};
