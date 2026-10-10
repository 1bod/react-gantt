import type { GanttTask, ParentMode, TaskPosition } from '../types';
export type RowKind = 'leaf' | 'group' | 'child';
export interface BarItem {
    task: GanttTask;
    parent: GanttTask | null;
}
export interface GanttRow {
    /** Stable key: the id of the row's task. */
    key: string;
    task: GanttTask;
    parent: GanttTask | null;
    depth: 0 | 1;
    kind: RowKind;
    /** Display mode, only for `group` rows. */
    mode: ParentMode | null;
    expanded: boolean;
    bars: BarItem[];
    /** Slot occupied by this row's task in the tree. */
    position: TaskPosition;
}
export declare function isGroup(task: GanttTask): boolean;
export declare function resolveParentMode(task: GanttTask, defaultMode: ParentMode): ParentMode;
/** Turns the task tree into the list of rows to display, honouring the expanded set. */
export declare function flattenRows(tasks: readonly GanttTask[], expandedIds: ReadonlySet<string>, defaultMode: ParentMode): GanttRow[];
/**
 * Resolves where a task ends up when dropped on `rowIndex`.
 * A task takes the slot of the row it is dropped on. Tasks that have children can
 * only live at the root level, so dropping one on a child row targets the child's parent slot.
 */
export declare function getDropPosition(rows: readonly GanttRow[], rowIndex: number, dragged: GanttTask): TaskPosition | null;
/** Finds a task (root or child) and its position. */
export declare function findTask(tasks: readonly GanttTask[], id: string): {
    task: GanttTask;
    position: TaskPosition;
} | null;
export declare function samePosition(a: TaskPosition, b: TaskPosition): boolean;
/** Row index of the row whose task has this id, or -1. */
export declare function findRowIndex(rows: readonly GanttRow[], taskId: string): number;
