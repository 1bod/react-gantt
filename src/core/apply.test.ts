import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import type { GanttTask, TaskChange } from '../types';
import { applyTaskChange, applyTaskChanges } from './apply';

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
  { id: 'b', label: 'B', start: 20, end: 30 },
];

function change(id: string, overrides: Partial<TaskChange> = {}): TaskChange {
  return {
    id,
    start: DateTime.fromMillis(1000),
    end: DateTime.fromMillis(2000),
    previousStart: DateTime.fromMillis(0),
    previousEnd: DateTime.fromMillis(10),
    reason: 'move',
    previousPosition: { parentId: null, index: 0 },
    ...overrides,
  };
}

const ids = (list: GanttTask[]) => list.map((t) => t.id);

describe('applyTaskChange', () => {
  it('updates dates of a root task without touching order', () => {
    const next = applyTaskChange(tasks, change('b'));
    expect(ids(next)).toEqual(['a', 'g', 'b']);
    expect(next[2]).toMatchObject({ start: 1000, end: 2000 });
    expect(next[0]).toBe(tasks[0]);
  });

  it('updates dates of a child', () => {
    const next = applyTaskChange(tasks, change('g2'));
    expect(next[1]!.children!.map((c) => c.id)).toEqual(['g1', 'g2']);
    expect(next[1]!.children![1]).toMatchObject({ start: 1000, end: 2000 });
  });

  it('reorders root tasks (down)', () => {
    const next = applyTaskChange(tasks, change('a', { position: { parentId: null, index: 2 } }));
    expect(ids(next)).toEqual(['g', 'b', 'a']);
  });

  it('reorders root tasks (up)', () => {
    const next = applyTaskChange(tasks, change('b', { position: { parentId: null, index: 0 } }));
    expect(ids(next)).toEqual(['b', 'a', 'g']);
  });

  it('nests a root task into a parent', () => {
    const next = applyTaskChange(tasks, change('a', { position: { parentId: 'g', index: 1 } }));
    expect(ids(next)).toEqual(['g', 'b']);
    expect(next[0]!.children!.map((c) => c.id)).toEqual(['g1', 'a', 'g2']);
    expect(next[0]!.children![1]).toMatchObject({ start: 1000, end: 2000 });
  });

  it('un-nests a child to the root level', () => {
    const next = applyTaskChange(tasks, change('g1', { position: { parentId: null, index: 0 } }));
    expect(ids(next)).toEqual(['g1', 'a', 'g', 'b']);
    expect(next[2]!.children!.map((c) => c.id)).toEqual(['g2']);
  });

  it('reorders children', () => {
    const next = applyTaskChange(tasks, change('g1', { position: { parentId: 'g', index: 1 } }));
    expect(next[1]!.children!.map((c) => c.id)).toEqual(['g2', 'g1']);
  });

  it('clamps the index', () => {
    const next = applyTaskChange(tasks, change('a', { position: { parentId: null, index: 99 } }));
    expect(ids(next)).toEqual(['g', 'b', 'a']);
  });

  it('returns a copy when the id is unknown', () => {
    const next = applyTaskChange(tasks, change('zzz'));
    expect(next).toEqual(tasks);
    expect(next).not.toBe(tasks);
  });

  it('does not mutate the input', () => {
    const snapshot = JSON.stringify(tasks);
    applyTaskChange(tasks, change('g1', { position: { parentId: null, index: 0 } }));
    expect(JSON.stringify(tasks)).toBe(snapshot);
  });

  it('applies several changes in order', () => {
    const next = applyTaskChanges(tasks, [
      change('a', { position: { parentId: null, index: 2 } }),
      change('b', { start: DateTime.fromMillis(5), end: DateTime.fromMillis(6) }),
    ]);
    expect(ids(next)).toEqual(['g', 'b', 'a']);
    expect(next[1]).toMatchObject({ start: 5, end: 6 });
  });
});

describe('applyTaskChange / resource mode', () => {
  it('moves a root task to another resource row', () => {
    const next = applyTaskChange(tasks, change('a', { rowId: 'm2', previousRowId: 'm1' }));
    expect(ids(next)).toEqual(['a', 'g', 'b']);
    expect(next[0]).toMatchObject({ rowId: 'm2', start: 1000, end: 2000 });
  });

  it('moves a child to another resource row', () => {
    const next = applyTaskChange(tasks, change('g2', { rowId: 'm3' }));
    expect(next[1]!.children![1]).toMatchObject({ id: 'g2', rowId: 'm3', start: 1000 });
  });

  it('keeps the row when the change has no rowId', () => {
    const withRow = [{ ...tasks[0]!, rowId: 'm1' }];
    expect(applyTaskChange(withRow, change('a'))[0]!.rowId).toBe('m1');
  });
});
