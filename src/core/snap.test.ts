import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { nearestEdge, snapTime, snapToGrid, snapUnitMs } from './snap';
import { DAY, HOUR, MINUTE } from './time';

const T0 = Date.UTC(2026, 0, 5, 10, 0, 0);

describe('snapUnitMs', () => {
  it('maps named units', () => {
    expect(snapUnitMs('minute')).toBe(MINUTE);
    expect(snapUnitMs('hour')).toBe(HOUR);
    expect(snapUnitMs('day')).toBe(DAY);
    expect(snapUnitMs('none')).toBe(0);
  });
  it('accepts a custom step and rejects non positive ones', () => {
    expect(snapUnitMs(15 * MINUTE)).toBe(15 * MINUTE);
    expect(snapUnitMs(0)).toBe(0);
    expect(snapUnitMs(-5)).toBe(0);
  });
});

describe('snapToGrid', () => {
  it('returns the input for none', () => {
    expect(snapToGrid(T0 + 1234, 'none')).toBe(T0 + 1234);
  });
  it('rounds to the nearest minute', () => {
    expect(snapToGrid(T0 + 29_999, 'minute')).toBe(T0);
    expect(snapToGrid(T0 + 30_000, 'minute')).toBe(T0 + MINUTE);
    expect(snapToGrid(T0 - 29_999, 'minute')).toBe(T0);
  });
  it('rounds to the nearest hour (luxon)', () => {
    expect(snapToGrid(T0 + 29 * MINUTE, 'hour', 'utc')).toBe(T0);
    expect(snapToGrid(T0 + 30 * MINUTE, 'hour', 'utc')).toBe(T0 + HOUR);
    expect(snapToGrid(T0 + 31 * MINUTE, 'hour', 'utc')).toBe(T0 + HOUR);
  });
  it('rounds to the nearest day in the given zone', () => {
    const noonParis = DateTime.fromISO('2026-01-05T12:00:00', { zone: 'Europe/Paris' }).toMillis();
    expect(snapToGrid(noonParis - 1, 'day', 'Europe/Paris')).toBe(
      DateTime.fromISO('2026-01-05T00:00:00', { zone: 'Europe/Paris' }).toMillis(),
    );
    expect(snapToGrid(noonParis, 'day', 'Europe/Paris')).toBe(
      DateTime.fromISO('2026-01-06T00:00:00', { zone: 'Europe/Paris' }).toMillis(),
    );
  });
  it('is DST safe for the day grid (23h day in Europe/Paris)', () => {
    // 2026-03-29: clocks jump from 02:00 to 03:00 in Paris, the day lasts 23 hours.
    const dstDayStart = DateTime.fromISO('2026-03-29T00:00:00', { zone: 'Europe/Paris' });
    const nextDayStart = DateTime.fromISO('2026-03-30T00:00:00', { zone: 'Europe/Paris' });
    expect(nextDayStart.toMillis() - dstDayStart.toMillis()).toBe(23 * HOUR);
    // 11h30 into the day is just before the midpoint of a 23h day: snaps to its start.
    expect(snapToGrid(dstDayStart.toMillis() + 11.5 * HOUR - 1, 'day', 'Europe/Paris')).toBe(dstDayStart.toMillis());
    expect(snapToGrid(dstDayStart.toMillis() + 11.5 * HOUR, 'day', 'Europe/Paris')).toBe(nextDayStart.toMillis());
  });
  it('is DST safe for the hour grid across the spring gap', () => {
    const before = DateTime.fromISO('2026-03-29T01:50:00', { zone: 'Europe/Paris' }).toMillis();
    const snapped = snapToGrid(before, 'hour', 'Europe/Paris');
    expect(DateTime.fromMillis(snapped, { zone: 'Europe/Paris' }).toFormat('HH:mm')).toBe('03:00');
    expect(snapped - before).toBe(10 * MINUTE);
  });
  it('supports custom steps', () => {
    expect(snapToGrid(T0 + 7 * MINUTE, 15 * MINUTE)).toBe(T0);
    expect(snapToGrid(T0 + 8 * MINUTE, 15 * MINUTE)).toBe(T0 + 15 * MINUTE);
  });
  it('treats non positive custom steps as none', () => {
    expect(snapToGrid(T0 + 7, 0)).toBe(T0 + 7);
  });
});

describe('nearestEdge', () => {
  const edges = [T0, T0 + HOUR, T0 + 2 * HOUR];
  it('returns null when nothing is in range', () => {
    expect(nearestEdge(T0 + 30 * MINUTE, edges, 10 * MINUTE)).toBeNull();
  });
  it('returns the closest edge inside the threshold', () => {
    expect(nearestEdge(T0 + 40 * MINUTE, edges, 25 * MINUTE)).toEqual({ edge: T0 + HOUR, distance: 20 * MINUTE });
  });
  it('threshold is inclusive', () => {
    expect(nearestEdge(T0 + 10 * MINUTE, edges, 10 * MINUTE)?.edge).toBe(T0);
  });
  it('picks the first of two equidistant edges', () => {
    expect(nearestEdge(T0 + 30 * MINUTE, edges, HOUR)?.edge).toBe(T0);
  });
  it('handles an empty edge list', () => {
    expect(nearestEdge(T0, [], HOUR)).toBeNull();
  });
});

describe('snapTime', () => {
  it('prefers edges over the grid', () => {
    const edge = T0 + 7 * MINUTE;
    expect(snapTime(T0 + 9 * MINUTE, { snap: 'hour', edges: [edge], edgeThresholdMs: 5 * MINUTE, zone: 'utc' })).toEqual({
      ms: edge,
      source: 'edge',
    });
  });
  it('falls back to the grid outside the edge radius', () => {
    expect(snapTime(T0 + 9 * MINUTE, { snap: 'hour', edges: [T0 + 30 * MINUTE], edgeThresholdMs: 5 * MINUTE, zone: 'utc' })).toEqual({
      ms: T0,
      source: 'grid',
    });
  });
  it('returns the raw value with snap none and no edge', () => {
    expect(snapTime(T0 + 9, { snap: 'none', edges: [], edgeThresholdMs: 0 })).toEqual({ ms: T0 + 9, source: 'none' });
  });
  it('ignores edges when the threshold is 0', () => {
    expect(snapTime(T0 + 1, { snap: 'none', edges: [T0 + 1], edgeThresholdMs: 0 }).source).toBe('none');
  });
});
