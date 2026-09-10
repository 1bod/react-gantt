import { describe, expect, it } from 'vitest';
import { buildHeaderTicks } from './header';
import { DAY, HOUR } from './time';

describe('buildHeaderTicks', () => {
  it('hour zoom: days over hours, clipped to the range', () => {
    const start = Date.UTC(2026, 0, 5, 22);
    const tiers = buildHeaderTicks({ startMs: start, endMs: start + 4 * HOUR }, 'hour', 'utc', 'en');
    expect(tiers.bottom.map((t) => t.label)).toEqual(['22:00', '23:00', '00:00', '01:00']);
    expect(tiers.top.map((t) => t.label)).toEqual(['Mon 5 Jan 2026', 'Tue 6 Jan 2026']);
    expect(tiers.top[0]).toMatchObject({ startMs: start, endMs: start + 2 * HOUR });
    expect(tiers.top[1]).toMatchObject({ startMs: start + 2 * HOUR, endMs: start + 4 * HOUR });
  });

  it('day zoom: months over days', () => {
    const start = Date.UTC(2026, 0, 30);
    const tiers = buildHeaderTicks({ startMs: start, endMs: start + 4 * DAY }, 'day', 'utc', 'en');
    expect(tiers.bottom.map((t) => t.label)).toEqual(['30', '31', '1', '2']);
    expect(tiers.top.map((t) => t.label)).toEqual(['January 2026', 'February 2026']);
  });

  it('week zoom: weeks start on monday', () => {
    const start = Date.UTC(2026, 0, 7); // wednesday
    const tiers = buildHeaderTicks({ startMs: start, endMs: start + 10 * DAY }, 'week', 'utc', 'en');
    expect(tiers.bottom.map((t) => t.label)).toEqual(['5 Jan', '12 Jan']);
    expect(tiers.bottom[0]!.startMs).toBe(start);
  });

  it('month zoom: years over months', () => {
    const start = Date.UTC(2025, 10, 1);
    const tiers = buildHeaderTicks({ startMs: start, endMs: Date.UTC(2026, 1, 1) }, 'month', 'utc', 'en');
    expect(tiers.bottom.map((t) => t.label)).toEqual(['Nov', 'Dec', 'Jan']);
    expect(tiers.top.map((t) => t.label)).toEqual(['2025', '2026']);
  });

  it('honours the locale', () => {
    const start = Date.UTC(2026, 0, 5);
    const tiers = buildHeaderTicks({ startMs: start, endMs: start + DAY }, 'day', 'utc', 'fr');
    expect(tiers.top[0]!.label).toBe('janvier 2026');
  });

  it('keys are unique', () => {
    const start = Date.UTC(2026, 0, 1);
    const tiers = buildHeaderTicks({ startMs: start, endMs: start + 60 * DAY }, 'day', 'utc');
    expect(new Set(tiers.bottom.map((t) => t.key)).size).toBe(tiers.bottom.length);
  });
});
