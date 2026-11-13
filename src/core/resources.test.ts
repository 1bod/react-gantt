import { describe, expect, it } from 'vitest';
import type { GanttResourceRow, GanttTask } from '../types';
import { buildResourceLayout } from './resources';

const rows: GanttResourceRow[] = [
  { id: 'm1', label: 'Machine 1' },
  { id: 'm2', label: 'Machine 2' },
  { id: 'm3', label: 'Machine 3' },
];

const tasks: GanttTask[] = [
  { id: 'a', label: 'A', start: 0, end: 10, rowId: 'm1' },
  { id: 'b', label: 'B', start: 5, end: 15, rowId: 'm1' },
  { id: 'c', label: 'C', start: 20, end: 30, rowId: 'm2' },
  { id: 'nowhere', label: 'N', start: 0, end: 10 },
  { id: 'unknown', label: 'U', start: 0, end: 10, rowId: 'zz' },
  {
    id: 'order',
    label: 'Order',
    start: 0,
    end: 100,
    children: [
      { id: 'op1', label: 'Op 1', start: 12, end: 18, rowId: 'm1' },
      { id: 'op2', label: 'Op 2', start: 30, end: 40, rowId: 'm3' },
    ],
  },
];

describe('buildResourceLayout', () => {
  const layout = buildResourceLayout(rows, tasks, 28, 24);

  it('one row per resource, in order', () => {
    expect(layout.rows.map((r) => r.key)).toEqual(['m1', 'm2', 'm3']);
    expect(layout.rows.map((r) => r.index)).toEqual([0, 1, 2]);
    expect(layout.rowIndexById.get('m2')).toBe(1);
  });

  it('draws root and child tasks on their row, ordered by start, ignoring unknown rows', () => {
    expect(layout.rows[0]!.bars.map((b) => b.task.id)).toEqual(['a', 'b', 'op1']);
    expect(layout.rows[1]!.bars.map((b) => b.task.id)).toEqual(['c']);
    expect(layout.rows[2]!.bars.map((b) => b.task.id)).toEqual(['op2']);
    expect(layout.barsById.has('nowhere')).toBe(false);
    expect(layout.barsById.has('unknown')).toBe(false);
  });

  it('packs overlapping bars into lanes and grows the row by laneHeight per extra lane', () => {
    expect(layout.rows[0]!.bars.map((b) => b.lane)).toEqual([0, 1, 0]);
    expect(layout.rows[0]!.laneCount).toBe(2);
    expect(layout.rows.map((r) => r.height)).toEqual([28 + 24, 28, 28]);
    expect(layout.rows.map((r) => r.top)).toEqual([0, 52, 80]);
    expect(layout.offsets).toEqual([0, 52, 80, 108]);
    expect(layout.height).toBe(108);
  });

  it('keeps the tree position and parent of each bar', () => {
    const op1 = layout.rows[0]!.bars[2]!;
    expect(op1.parent?.id).toBe('order');
    expect(op1.position).toEqual({ parentId: 'order', index: 0 });
    expect(layout.rows[0]!.bars[0]!.position).toEqual({ parentId: null, index: 0 });
    expect(layout.barsById.get('b')).toEqual({ rowIndex: 0, lane: 1 });
  });

  it('handles no rows', () => {
    const empty = buildResourceLayout([], tasks, 28, 24);
    expect(empty.rows).toEqual([]);
    expect(empty.height).toBe(0);
  });
});
