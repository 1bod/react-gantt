import type { GanttResourceRow, GanttTask, TaskPosition } from '../types';
export interface ResourceBar {
    task: GanttTask;
    parent: GanttTask | null;
    /** Slot of the task in the tree. */
    position: TaskPosition;
    /** Lane of the bar inside its row, 0 being the top lane. */
    lane: number;
}
export interface ResourceRowLayout {
    /** Stable key: the id of the resource row. */
    key: string;
    row: GanttResourceRow;
    index: number;
    /** Offset of the row from the top of the body, in pixels. */
    top: number;
    height: number;
    laneCount: number;
    /** Bars of the row, ordered by start then id. */
    bars: ResourceBar[];
}
export interface ResourceLayout {
    rows: ResourceRowLayout[];
    /** Cumulative row offsets, see `buildOffsets`. */
    offsets: number[];
    height: number;
    /** Row index by row id. */
    rowIndexById: Map<string, number>;
    /** Row index and lane of every drawn task, by task id. */
    barsById: Map<string, {
        rowIndex: number;
        lane: number;
    }>;
}
/**
 * Lays out the resource mode: every task (root or child) whose `rowId` matches a row is
 * drawn on that row; overlapping bars are packed into lanes and each extra lane adds
 * `laneHeight` to the row. Tasks without a known `rowId` are not drawn.
 */
export declare function buildResourceLayout(rows: readonly GanttResourceRow[], tasks: readonly GanttTask[], rowHeight: number, laneHeight: number): ResourceLayout;
