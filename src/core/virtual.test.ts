import { describe, expect, it } from 'vitest';
import { buildOffsets, findRowAt, getVisibleRange, getVisibleRangeByOffsets } from './virtual';

describe('getVisibleRange', () => {
  it('renders the first rows at scroll 0 with overscan after', () => {
    expect(getVisibleRange(0, 360, 36, 1000, 5)).toEqual({ start: 0, end: 16 });
  });

  it('windows around the scroll offset', () => {
    // row 100 is the first visible one; 11 visible rows; 5 overscan each side.
    expect(getVisibleRange(3600, 360, 36, 1000, 5)).toEqual({ start: 95, end: 116 });
  });

  it('never exceeds the row count', () => {
    expect(getVisibleRange(3600 * 10, 360, 36, 1005, 5)).toEqual({ start: 995, end: 1005 });
  });

  it('handles partial rows', () => {
    const r = getVisibleRange(20, 100, 36, 1000, 0);
    expect(r.start).toBe(0);
    expect(r.end).toBe(4);
  });

  it('is empty for no rows', () => {
    expect(getVisibleRange(0, 360, 36, 0)).toEqual({ start: 0, end: 0 });
    expect(getVisibleRange(0, 360, 0, 10)).toEqual({ start: 0, end: 0 });
  });

  it('tolerates negative scroll (overscroll bounce)', () => {
    expect(getVisibleRange(-50, 360, 36, 100, 2).start).toBe(0);
  });
});

describe('variable row heights', () => {
  const offsets = buildOffsets([28, 52, 28, 100, 28]);

  it('buildOffsets accumulates the heights', () => {
    expect(offsets).toEqual([0, 28, 80, 108, 208, 236]);
    expect(buildOffsets([])).toEqual([0]);
  });

  it('findRowAt finds the row containing a position, clamped', () => {
    expect(findRowAt(offsets, 0)).toBe(0);
    expect(findRowAt(offsets, 27.9)).toBe(0);
    expect(findRowAt(offsets, 28)).toBe(1);
    expect(findRowAt(offsets, 150)).toBe(3);
    expect(findRowAt(offsets, -10)).toBe(0);
    expect(findRowAt(offsets, 10_000)).toBe(4);
    expect(findRowAt([0], 10)).toBe(-1);
  });

  it('getVisibleRangeByOffsets windows around the viewport with overscan', () => {
    expect(getVisibleRangeByOffsets(offsets, 0, 50, 0)).toEqual({ start: 0, end: 2 });
    expect(getVisibleRangeByOffsets(offsets, 100, 20, 0)).toEqual({ start: 2, end: 4 });
    expect(getVisibleRangeByOffsets(offsets, 100, 20, 1)).toEqual({ start: 1, end: 5 });
    expect(getVisibleRangeByOffsets(offsets, -50, 0, 0)).toEqual({ start: 0, end: 1 });
    expect(getVisibleRangeByOffsets([0], 0, 100)).toEqual({ start: 0, end: 0 });
  });

  it('scales to many rows', () => {
    const many = buildOffsets(Array.from({ length: 10_000 }, (_, i) => (i % 3 === 0 ? 52 : 28)));
    const range = getVisibleRangeByOffsets(many, many[5000]!, 400, 2);
    expect(range.start).toBe(4998);
    expect(range.end).toBeGreaterThan(5010);
    expect(range.end).toBeLessThan(5030);
  });
});
