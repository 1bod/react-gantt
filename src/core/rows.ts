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

export function isGroup(task: GanttTask): boolean {
  return Array.isArray(task.children) && task.children.length > 0;
}

export function resolveParentMode(task: GanttTask, defaultMode: ParentMode): ParentMode {
  return task.parentMode ?? defaultMode;
}

/** Turns the task tree into the list of rows to display, honouring the expanded set. */
export function flattenRows(
  tasks: readonly GanttTask[],
  expandedIds: ReadonlySet<string>,
  defaultMode: ParentMode,
): GanttRow[] {
  const rows: GanttRow[] = [];
  tasks.forEach((task, index) => {
    const position: TaskPosition = { parentId: null, index };
    if (!isGroup(task)) {
      rows.push({
        key: task.id,
        task,
        parent: null,
        depth: 0,
        kind: 'leaf',
        mode: null,
        expanded: false,
        bars: [{ task, parent: null }],
        position,
      });
      return;
    }
    const mode = resolveParentMode(task, defaultMode);
    const expanded = expandedIds.has(task.id);
    const children = task.children ?? [];
    rows.push({
      key: task.id,
      task,
      parent: null,
      depth: 0,
      kind: 'group',
      mode,
      expanded,
      bars:
        mode === 'independent'
          ? [{ task, parent: null }]
          : children.map((child) => ({ task: child, parent: task })),
      position,
    });
    if (expanded) {
      children.forEach((child, childIndex) => {
        rows.push({
          key: child.id,
          task: child,
          parent: task,
          depth: 1,
          kind: 'child',
          mode: null,
          expanded: false,
          bars: [{ task: child, parent: task }],
          position: { parentId: task.id, index: childIndex },
        });
      });
    }
  });
  return rows;
}

/**
 * Resolves where a task ends up when dropped on `rowIndex`.
 * A task takes the slot of the row it is dropped on. Tasks that have children can
 * only live at the root level, so dropping one on a child row targets the child's parent slot.
 */
export function getDropPosition(rows: readonly GanttRow[], rowIndex: number, dragged: GanttTask): TaskPosition | null {
  const row = rows[rowIndex];
  if (!row) return null;
  if (isGroup(dragged) && row.depth === 1) {
    const parentRow = rows.find((r) => r.depth === 0 && r.task.id === row.parent?.id);
    return parentRow ? { ...parentRow.position } : null;
  }
  return { ...row.position };
}

/** Finds a task (root or child) and its position. */
export function findTask(tasks: readonly GanttTask[], id: string): { task: GanttTask; position: TaskPosition } | null {
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]!;
    if (task.id === id) return { task, position: { parentId: null, index: i } };
    const children = task.children ?? [];
    for (let j = 0; j < children.length; j++) {
      const child = children[j]!;
      if (child.id === id) return { task: child, position: { parentId: task.id, index: j } };
    }
  }
  return null;
}

export function samePosition(a: TaskPosition, b: TaskPosition): boolean {
  return a.parentId === b.parentId && a.index === b.index;
}

/** Row index of the row whose task has this id, or -1. */
export function findRowIndex(rows: readonly GanttRow[], taskId: string): number {
  return rows.findIndex((row) => row.task.id === taskId);
}
