import { describe, expect, it } from 'vitest';
import { packLanes } from './lanes';

const lanesOf = (layout: ReturnType<typeof packLanes>) => Object.fromEntries(layout.lanes);

describe('packLanes', () => {
  it('an empty row still has one lane', () => {
    expect(packLanes([])).toEqual({ lanes: new Map(), count: 1 });
  });

  it('keeps disjoint and touching items on the first lane', () => {
    const layout = packLanes([
      { id: 'a', start: 0, end: 10 },
      { id: 'b', start: 10, end: 20 },
      { id: 'c', start: 25, end: 30 },
    ]);
    expect(lanesOf(layout)).toEqual({ a: 0, b: 0, c: 0 });
    expect(layout.count).toBe(1);
  });

  it('opens a lane per overlap and reuses the first free one', () => {
    const layout = packLanes([
      { id: 'a', start: 0, end: 10 },
      { id: 'b', start: 5, end: 15 },
      { id: 'c', start: 6, end: 8 },
      { id: 'd', start: 9, end: 12 }, // lane 0 is still busy (a ends at 10), lane 2 is free (c ended at 8)
      { id: 'e', start: 16, end: 20 },
    ]);
    expect(lanesOf(layout)).toEqual({ a: 0, b: 1, c: 2, d: 2, e: 0 });
    expect(layout.count).toBe(3);
  });

  it('is stable: input order does not matter, ties broken by id', () => {
    const items = [
      { id: 'b', start: 0, end: 10 },
      { id: 'a', start: 0, end: 10 },
      { id: 'c', start: 2, end: 4 },
    ];
    const forward = lanesOf(packLanes(items));
    const backward = lanesOf(packLanes(items.slice().reverse()));
    expect(forward).toEqual({ a: 0, b: 1, c: 2 });
    expect(backward).toEqual(forward);
  });

  it('never puts two overlapping items on the same lane', () => {
    // Deterministic pseudo random intervals.
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const items = Array.from({ length: 200 }, (_, i) => {
      const start = Math.floor(rand() * 1000);
      return { id: `t${i}`, start, end: start + 1 + Math.floor(rand() * 80) };
    });
    const { lanes, count } = packLanes(items);
    for (const a of items) {
      for (const b of items) {
        if (a.id !== b.id && lanes.get(a.id) === lanes.get(b.id)) {
          expect(a.end <= b.start || b.end <= a.start).toBe(true);
        }
      }
    }
    expect(Math.max(...lanes.values()) + 1).toBe(count);
  });
});
