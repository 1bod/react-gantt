import type { GanttResourceRow, GanttTask, TaskPosition } from '../types';
import { packLanes } from './lanes';
import { toMs } from './time';
import { buildOffsets } from './virtual';

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
  barsById: Map<string, { rowIndex: number; lane: number }>;
}

/**
 * Lays out the resource mode: every task (root or child) whose `rowId` matches a row is
 * drawn on that row; overlapping bars are packed into lanes and each extra lane adds
 * `laneHeight` to the row. Tasks without a known `rowId` are not drawn.
 */
export function buildResourceLayout(
  rows: readonly GanttResourceRow[],
  tasks: readonly GanttTask[],
  rowHeight: number,
  laneHeight: number,
): ResourceLayout {
  const rowIndexById = new Map<string, number>();
  rows.forEach((row, index) => rowIndexById.set(row.id, index));

  type Item = { task: GanttTask; parent: GanttTask | null; position: TaskPosition; start: number; end: number };
  const tasksByRow: Item[][] = rows.map(() => []);
  const visit = (task: GanttTask, parent: GanttTask | null, index: number) => {
    const rowIndex = task.rowId === undefined ? undefined : rowIndexById.get(task.rowId);
    if (rowIndex !== undefined) {
      const position = { parentId: parent ? parent.id : null, index };
      tasksByRow[rowIndex]!.push({ task, parent, position, start: toMs(task.start), end: toMs(task.end) });
    }
    task.children?.forEach((child, childIndex) => visit(child, task, childIndex));
  };
  tasks.forEach((task, index) => visit(task, null, index));

  const barsById = new Map<string, { rowIndex: number; lane: number }>();
  const heights: number[] = [];
  const layouts = rows.map((row, index) => {
    const items = tasksByRow[index]!;
    const { lanes, count } = packLanes(items.map((item) => ({ id: item.task.id, start: item.start, end: item.end })));
    const bars = items
      .slice()
      .sort((a, b) => a.start - b.start || (a.task.id < b.task.id ? -1 : a.task.id > b.task.id ? 1 : 0))
      .map((item) => {
        const lane = lanes.get(item.task.id)!;
        barsById.set(item.task.id, { rowIndex: index, lane });
        return { task: item.task, parent: item.parent, position: item.position, lane };
      });
    const height = rowHeight + (count - 1) * laneHeight;
    heights.push(height);
    return { key: row.id, row, index, top: 0, height, laneCount: count, bars };
  });
  const offsets = buildOffsets(heights);
  layouts.forEach((layout, index) => {
    layout.top = offsets[index]!;
  });
  return { rows: layouts, offsets, height: offsets[offsets.length - 1]!, rowIndexById, barsById };
}
