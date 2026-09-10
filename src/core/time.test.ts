import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import type { GanttTask } from '../types';
import { computeRange, createTimeScale, DAY, HOUR, msToPx, pxToMs, scaleWidth, toDateTime, toMs } from './time';

const T0 = Date.UTC(2026, 0, 5, 10, 0, 0); // Mon 2026-01-05 10:00 UTC

describe('toMs', () => {
  it('accepts Date', () => {
    expect(toMs(new Date(T0))).toBe(T0);
  });
  it('accepts numbers', () => {
    expect(toMs(T0)).toBe(T0);
  });
  it('accepts ISO strings', () => {
    expect(toMs('2026-01-05T10:00:00Z')).toBe(T0);
  });
  it('accepts luxon DateTime', () => {
    expect(toMs(DateTime.fromMillis(T0))).toBe(T0);
  });
  it('throws on invalid ISO', () => {
    expect(() => toMs('not a date')).toThrow(/invalid ISO/);
  });
  it('throws on unsupported input', () => {
    // @ts-expect-error runtime guard
    expect(() => toMs({})).toThrow();
  });
});

describe('toDateTime', () => {
  it('builds a DateTime in the requested zone', () => {
    const dt = toDateTime(T0, 'utc');
    expect(dt.toMillis()).toBe(T0);
    expect(dt.zoneName).toBe('UTC');
  });
});

describe('time scale', () => {
  const scale = createTimeScale(T0, T0 + 10 * DAY, 'day', 50);

  it('maps ms to px linearly', () => {
    expect(msToPx(scale, T0)).toBe(0);
    expect(msToPx(scale, T0 + DAY)).toBe(50);
    expect(msToPx(scale, T0 + 2.5 * DAY)).toBe(125);
  });
  it('maps px back to ms', () => {
    expect(pxToMs(scale, 0)).toBe(T0);
    expect(pxToMs(scale, 50)).toBe(T0 + DAY);
    expect(pxToMs(scale, msToPx(scale, T0 + 3 * HOUR))).toBeCloseTo(T0 + 3 * HOUR, 5);
  });
  it('computes total width', () => {
    expect(scaleWidth(scale)).toBe(500);
  });
  it('supports every zoom level', () => {
    expect(createTimeScale(0, 1, 'hour', 60).pxPerMs).toBe(60 / HOUR);
    expect(createTimeScale(0, 1, 'week', 70).pxPerMs).toBe(70 / (7 * DAY));
    expect(createTimeScale(0, 1, 'month', 120).pxPerMs).toBeCloseTo(120 / (30.4375 * DAY), 12);
  });
});

describe('computeRange', () => {
  const tasks: GanttTask[] = [
    { id: 'a', label: 'a', start: '2026-01-05T10:00:00Z', end: '2026-01-06T12:00:00Z' },
    {
      id: 'b',
      label: 'b',
      start: '2026-01-07T00:00:00Z',
      end: '2026-01-07T02:00:00Z',
      children: [{ id: 'b1', label: 'b1', start: '2026-01-02T00:00:00Z', end: '2026-01-09T18:00:00Z' }],
    },
  ];

  it('covers every task including children, padded by one unit on unit boundaries', () => {
    const range = computeRange(tasks, 'day', 'utc');
    expect(range.startMs).toBe(Date.UTC(2026, 0, 1));
    expect(range.endMs).toBe(Date.UTC(2026, 0, 11));
  });

  it('uses hour boundaries at the hour zoom', () => {
    const range = computeRange([tasks[0]!], 'hour', 'utc');
    expect(range.startMs).toBe(Date.UTC(2026, 0, 5, 9));
    expect(range.endMs).toBe(Date.UTC(2026, 0, 6, 14));
  });

  it('falls back to a week from now when there is no task', () => {
    const range = computeRange([], 'day', 'utc', T0);
    expect(range.startMs).toBe(Date.UTC(2026, 0, 4));
    expect(range.endMs).toBe(Date.UTC(2026, 0, 14));
  });
});
