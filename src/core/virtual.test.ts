import { describe, expect, it } from 'vitest';
import { getVisibleRange } from './virtual';

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
