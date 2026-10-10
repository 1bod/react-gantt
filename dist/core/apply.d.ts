import type { GanttTask, TaskChange } from '../types';
/**
 * Pure helper for controlled usage: returns a new task tree with the change applied.
 * Handles date updates, vertical moves (reorder, nest, un-nest) and, in resource mode,
 * moves to another resource row (`rowId`).
 */
export declare function applyTaskChange<T extends GanttTask>(tasks: readonly T[], change: TaskChange): T[];
export declare function applyTaskChanges<T extends GanttTask>(tasks: readonly T[], changes: readonly TaskChange[]): T[];
