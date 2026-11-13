import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { clipRanges, toIntervals } from './closed';
import { HOUR } from './time';

const T0 = Date.UTC(2026, 0, 5);

describe('toIntervals', () => {
  it('accepts every date input and drops empty or inverted ranges', () => {
    expect(
      toIntervals([
        { start: T0, end: T0 + HOUR },
        { start: new Date(T0 + 2 * HOUR), end: DateTime.fromMillis(T0 + 3 * HOUR) },
        { start: '2026-01-05T05:00:00Z', end: '2026-01-05T06:00:00Z' },
        { start: T0 + 9 * HOUR, end: T0 + 9 * HOUR },
        { start: T0 + 9 * HOUR, end: T0 + 8 * HOUR },
      ]),
    ).toEqual([
      { start: T0, end: T0 + HOUR },
      { start: T0 + 2 * HOUR, end: T0 + 3 * HOUR },
      { start: T0 + 5 * HOUR, end: T0 + 6 * HOUR },
    ]);
  });
});

describe('clipRanges', () => {
  const ranges = [
    { start: 0, end: 10 },
    { start: 20, end: 40 },
    { start: 50, end: 60 },
    { start: 90, end: 200 },
  ];

  it('keeps the visible part of each range only', () => {
    expect(clipRanges(ranges, 30, 100)).toEqual([
      { start: 30, end: 40 },
      { start: 50, end: 60 },
      { start: 90, end: 100 },
    ]);
  });

  it('drops ranges that only touch the window', () => {
    expect(clipRanges(ranges, 10, 20)).toEqual([]);
  });

  it('returns everything inside a wide window', () => {
    expect(clipRanges(ranges, -1000, 1000)).toEqual(ranges);
  });
});
