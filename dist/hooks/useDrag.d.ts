import { type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { type DragKind, type DragResult } from '../core/drag';
import type { TimeScale } from '../core/time';
import type { SnapMode } from '../types';
export interface DragSession {
    taskId: string;
    kind: DragKind;
    originStart: number;
    originEnd: number;
    originRowIndex: number;
    /** Resource mode: centre of the bar's lane, from the top of the body. */
    anchorY?: number;
    pointerId: number;
    startX: number;
    startY: number;
    startScrollLeft: number;
    startScrollTop: number;
    /** Magnet edges (other tasks), captured when the drag starts. */
    edges: number[];
    moved: boolean;
}
export interface DragState {
    session: DragSession;
    result: DragResult;
    /** Pointer displacement (scroll included) since the drag started. */
    deltaX: number;
    deltaY: number;
    /** Unsnapped interval under the pointer. */
    raw: {
        start: number;
        end: number;
    };
}
export interface UseDragParams {
    enabled: boolean;
    scrollerRef: RefObject<HTMLElement | null>;
    scale: TimeScale;
    rowCount: number;
    rowHeight: number;
    /** Variable row heights (resource mode), see `DragInput.rowTops`. */
    rowTops?: readonly number[];
    snap: SnapMode;
    zone: string;
    snapToTasks: boolean;
    snapThresholdPx: number;
    minDurationMs: number;
    allowVertical: boolean;
    allowResize: boolean;
    getInterval: (taskId: string) => {
        start: number;
        end: number;
    } | undefined;
    getEdges: (excludeTaskId: string) => number[];
    onPreview: (session: DragSession, result: DragResult | null) => void;
    onDrop: (session: DragSession, result: DragResult) => void;
    onClick: (session: DragSession, event: ReactPointerEvent<HTMLElement>) => void;
}
export interface BarDragHandlers {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
    onLostPointerCapture: (event: ReactPointerEvent<HTMLElement>) => void;
}
/** Pixels the pointer must travel before a press becomes a drag. */
export declare const DRAG_THRESHOLD_PX = 3;
/**
 * Pointer based drag & drop for task bars. Geometry is derived from pointer deltas
 * (plus scroll deltas), so it stays correct while the container auto-scrolls.
 */
export declare function useDrag(params: UseDragParams): {
    drag: DragState | null;
    getBarHandlers: (taskId: string, rowIndex: number, anchorY?: number) => BarDragHandlers;
    cancel: () => void;
};
