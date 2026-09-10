import { describe, expect, it } from 'vitest';
import type { GanttTask } from '../types';
import { findRowIndex, findTask, flattenRows, getDropPosition, isGroup, samePosition } from './rows';

const tasks: GanttTask[] = [
  { id: 'a', label: 'A', start: 0, end: 10 },
  {
    id: 'g',
    label: 'G',
    start: 0,
    end: 100,
    children: [
      { id: 'g1', label: 'G1', start: 0, end: 5 },
      { id: 'g2', label: 'G2', start: 5, end: 9 },
    ],
  },
  { id: 'i', label: 'I', start: 0, end: 100, parentMode: 'inline', children: [{ id: 'i1', label: 'I1', start: 1, end: 2 }] },
  { id: 'empty', label: 'E', start: 0, end: 1, children: [] },
];

describe('isGroup', () => {
  it('needs at least one child', () => {
    expect(isGroup(tasks[0]!)).toBe(false);
    expect(isGroup(tasks[1]!)).toBe(true);
    expect(isGroup(tasks[3]!)).toBe(false);
  });
});

describe('flattenRows', () => {
  it('collapsed: one row per root task', () => {
    const rows = flattenRows(tasks, new Set(), 'independent');
    expect(rows.map((r) => r.key)).toEqual(['a', 'g', 'i', 'empty']);
    expect(rows.map((r) => r.kind)).toEqual(['leaf', 'group', 'group', 'leaf']);
    expect(rows[0]!.bars.map((b) => b.task.id)).toEqual(['a']);
    expect(rows[1]!.bars.map((b) => b.task.id)).toEqual(['g']);
    expect(rows[1]!.mode).toBe('independent');
  });

  it('inline mode draws children on the parent row', () => {
    const rows = flattenRows(tasks, new Set(), 'independent');
    const inline = rows[2]!;
    expect(inline.mode).toBe('inline');
    expect(inline.bars.map((b) => b.task.id)).toEqual(['i1']);
    expect(inline.bars[0]!.parent?.id).toBe('i');
  });

  it('the default parent mode applies to tasks without an override', () => {
    const rows = flattenRows(tasks, new Set(), 'inline');
    expect(rows[1]!.mode).toBe('inline');
    expect(rows[1]!.bars.map((b) => b.task.id)).toEqual(['g1', 'g2']);
    expect(rows[2]!.mode).toBe('inline');
  });

  it('expanded: children rows follow their parent', () => {
    const rows = flattenRows(tasks, new Set(['g']), 'independent');
    expect(rows.map((r) => r.key)).toEqual(['a', 'g', 'g1', 'g2', 'i', 'empty']);
    expect(rows[1]!.expanded).toBe(true);
    expect(rows[2]).toMatchObject({ kind: 'child', depth: 1, position: { parentId: 'g', index: 0 } });
    expect(rows[3]).toMatchObject({ kind: 'child', depth: 1, position: { parentId: 'g', index: 1 } });
    expect(rows[2]!.parent?.id).toBe('g');
    expect(rows[4]!.position).toEqual({ parentId: null, index: 2 });
  });

  it('ignores expanded ids that are not groups', () => {
    const rows = flattenRows(tasks, new Set(['a', 'empty', 'unknown']), 'independent');
    expect(rows).toHaveLength(4);
  });
});

describe('getDropPosition', () => {
  const rows = flattenRows(tasks, new Set(['g']), 'independent');
  // rows: a(0) g(1) g1(2) g2(3) i(4) empty(5)

  it('a leaf takes the slot of the target row', () => {
    expect(getDropPosition(rows, 0, tasks[0]!)).toEqual({ parentId: null, index: 0 });
    expect(getDropPosition(rows, 3, tasks[0]!)).toEqual({ parentId: 'g', index: 1 });
    expect(getDropPosition(rows, 5, tasks[0]!)).toEqual({ parentId: null, index: 3 });
  });

  it('a group dropped on a child row targets the parent slot', () => {
    expect(getDropPosition(rows, 2, tasks[2]!)).toEqual({ parentId: null, index: 1 });
  });

  it('a group dropped on a root row takes that slot', () => {
    expect(getDropPosition(rows, 5, tasks[1]!)).toEqual({ parentId: null, index: 3 });
  });

  it('returns null for an out of range row', () => {
    expect(getDropPosition(rows, 42, tasks[0]!)).toBeNull();
    expect(getDropPosition(rows, -1, tasks[0]!)).toBeNull();
  });
});

describe('findTask', () => {
  it('finds root tasks and children', () => {
    expect(findTask(tasks, 'a')).toMatchObject({ position: { parentId: null, index: 0 } });
    expect(findTask(tasks, 'g2')).toMatchObject({ task: { id: 'g2' }, position: { parentId: 'g', index: 1 } });
    expect(findTask(tasks, 'nope')).toBeNull();
  });
});

describe('helpers', () => {
  it('samePosition', () => {
    expect(samePosition({ parentId: null, index: 1 }, { parentId: null, index: 1 })).toBe(true);
    expect(samePosition({ parentId: null, index: 1 }, { parentId: 'g', index: 1 })).toBe(false);
  });
  it('findRowIndex', () => {
    const rows = flattenRows(tasks, new Set(['g']), 'independent');
    expect(findRowIndex(rows, 'g2')).toBe(3);
    expect(findRowIndex(rows, 'zzz')).toBe(-1);
  });
});
