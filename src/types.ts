import type { DateTime } from 'luxon';
import type { ReactNode } from 'react';

/** Any date representation accepted as input. Internally everything is epoch milliseconds. */
export type DateInput = Date | DateTime | string | number;

/** How a task that has children is displayed. */
export type ParentMode =
  /** The parent has its own bar, fully decoupled from its children. */
  | 'independent'
  /** The parent has no bar of its own: its children are drawn side by side on its row. */
  | 'inline';

export type ZoomLevel = 'hour' | 'day' | 'week' | 'month';

/** Grid snapping. A number is a custom step in milliseconds. */
export type SnapMode = 'minute' | 'hour' | 'day' | 'none' | number;

export type ChangeReason = 'move' | 'resize-start' | 'resize-end' | 'keyboard';

export interface GanttTask<TData = unknown> {
  id: string;
  /** Content displayed in the sidebar and inside the bar. */
  label: ReactNode;
  start: DateInput;
  end: DateInput;
  /** Any CSS color. Falls back to the `--gantt-bar-color` CSS variable. */
  color?: string;
  /** Sub tasks. Only one level of nesting is supported. */
  children?: GanttTask<TData>[];
  /** Overrides the component level `parentMode` for this task. */
  parentMode?: ParentMode;
  /** Free slot for consumer data, passed back untouched in render props and events. */
  data?: TData;
  /** Resource mode (`rows` prop): id of the row the task is drawn on. */
  rowId?: string;
}

/** A row of the resource mode (a machine, an operator…). Tasks are drawn on it through `task.rowId`. */
export interface GanttResourceRow<TRowData = unknown> {
  id: string;
  /** Content displayed in the sidebar. */
  label: ReactNode;
  /** Free slot for consumer data, passed back untouched in render props. */
  data?: TRowData;
}

/** A period during which a row is not available (night, weekend, maintenance…). */
export interface ClosedRange {
  start: DateInput;
  end: DateInput;
}

/** Where a task lives in the tree: `parentId` is `null` at the root level. */
export interface TaskPosition {
  parentId: string | null;
  /** Index of the task among its siblings, after the move has been applied. */
  index: number;
}

export interface TaskChange {
  id: string;
  start: DateTime;
  end: DateTime;
  previousStart: DateTime;
  previousEnd: DateTime;
  reason: ChangeReason;
  /** Present only when the task was moved to another row. */
  position?: TaskPosition;
  previousPosition: TaskPosition;
  /** Resource mode: present only when the task was moved to another resource row. */
  rowId?: string;
  /** Resource mode: the row the task was on before the change. */
  previousRowId?: string;
}

export interface DragPreview {
  id: string;
  start: DateTime;
  end: DateTime;
  reason: ChangeReason;
  position: TaskPosition;
  /** What the current position snapped to. */
  snappedTo: 'edge' | 'grid' | 'none';
  /** Resource mode: the row under the pointer. */
  rowId?: string;
}
