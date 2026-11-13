import type { GanttTask, TaskChange } from '../types';

/**
 * Pure helper for controlled usage: returns a new task tree with the change applied.
 * Handles date updates, vertical moves (reorder, nest, un-nest) and, in resource mode,
 * moves to another resource row (`rowId`).
 */
export function applyTaskChange<T extends GanttTask>(tasks: readonly T[], change: TaskChange): T[] {
  const start = change.start.toMillis();
  const end = change.end.toMillis();
  const update = (task: T): T => (change.rowId === undefined ? { ...task, start, end } : { ...task, start, end, rowId: change.rowId });

  let moved: T | null = null;
  const withoutMoved: T[] = [];
  const target = change.position;

  for (const task of tasks) {
    if (task.id === change.id) {
      moved = update(task);
      if (!target) withoutMoved.push(moved);
      continue;
    }
    const children = task.children as T[] | undefined;
    if (!children) {
      withoutMoved.push(task);
      continue;
    }
    let touched = false;
    const nextChildren: T[] = [];
    for (const child of children) {
      if (child.id === change.id) {
        moved = update(child);
        touched = true;
        if (!target) nextChildren.push(moved);
        continue;
      }
      nextChildren.push(child);
    }
    withoutMoved.push(touched ? { ...task, children: nextChildren } : task);
  }

  if (!moved) return tasks.slice();
  if (!target) return withoutMoved;

  if (target.parentId === null) {
    const index = Math.min(Math.max(target.index, 0), withoutMoved.length);
    withoutMoved.splice(index, 0, moved);
    return withoutMoved;
  }

  const movedTask = moved;
  return withoutMoved.map((task) => {
    if (task.id !== target.parentId) return task;
    const children = ((task.children ?? []) as T[]).slice();
    const index = Math.min(Math.max(target.index, 0), children.length);
    children.splice(index, 0, movedTask);
    return { ...task, children };
  });
}

export function applyTaskChanges<T extends GanttTask>(tasks: readonly T[], changes: readonly TaskChange[]): T[] {
  return changes.reduce<T[]>((acc, change) => applyTaskChange(acc, change), tasks.slice());
}
