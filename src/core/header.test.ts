import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { buildHeaderTicks, type HeaderTierSpecs } from './header';
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

describe('buildHeaderTicks / custom tiers', () => {
  it('steps are aligned on the parent unit', () => {
    const start = Date.UTC(2026, 0, 5, 4); // 04:00, mid step
    const tiers = buildHeaderTicks({ startMs: start, endMs: start + DAY }, 'day', 'utc', 'en', [
      { unit: 'day', format: 'ccc d LLL' },
      { unit: 'hour', step: 6, format: 'HH:mm' },
    ]);
    expect(tiers.top.map((t) => t.label)).toEqual(['Mon 5 Jan', 'Tue 6 Jan']);
    expect(tiers.bottom.map((t) => t.label)).toEqual(['00:00', '06:00', '12:00', '18:00', '00:00']);
    expect(tiers.bottom[0]).toMatchObject({ startMs: start, endMs: start + 2 * HOUR }); // clipped
    expect(tiers.bottom[1]!.startMs).toBe(start + 2 * HOUR);
  });

  it('keeps the step grid across DST changes', () => {
    const paris = (iso: string) => DateTime.fromISO(iso, { zone: 'Europe/Paris' }).toMillis();
    const spec = [
      { unit: 'day', format: 'd' },
      { unit: 'hour', step: 6, format: 'HH' },
    ] as const satisfies HeaderTierSpecs;
    const autumn = buildHeaderTicks({ startMs: paris('2026-10-25T00:00'), endMs: paris('2026-10-26T00:00') }, 'day', 'Europe/Paris', 'en', [...spec]);
    expect(autumn.bottom.map((t) => t.label)).toEqual(['00', '06', '12', '18']);
    const spring = buildHeaderTicks({ startMs: paris('2026-03-29T00:00'), endMs: paris('2026-03-30T00:00') }, 'day', 'Europe/Paris', 'en', [...spec]);
    expect(spring.bottom.map((t) => t.label)).toEqual(['00', '06', '12', '18']);
  });

  it('accepts format functions and every unit', () => {
    const start = Date.UTC(2026, 0, 1);
    const tiers = buildHeaderTicks({ startMs: start, endMs: Date.UTC(2027, 0, 1) }, 'month', 'utc', 'en', [
      { unit: 'year', step: 2, format: (dt) => `Y${dt.year}` },
      { unit: 'quarter', format: (dt) => `Q${dt.quarter}` },
    ]);
    expect(tiers.top.map((t) => t.label)).toEqual(['Y2026']);
    expect(tiers.bottom.map((t) => t.label)).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
    const minutes = buildHeaderTicks({ startMs: start, endMs: start + HOUR }, 'hour', 'utc', 'en', [
      { unit: 'hour', format: 'HH' },
      { unit: 'minute', step: 15, format: 'mm' },
    ]);
    expect(minutes.bottom.map((t) => t.label)).toEqual(['00', '15', '30', '45']);
    const weeks = buildHeaderTicks({ startMs: Date.UTC(2026, 9, 12), endMs: Date.UTC(2026, 9, 26) }, 'week', 'utc', 'en', [
      { unit: 'week', format: "'W'W" },
      { unit: 'day', step: 7, format: 'd' },
    ]);
    expect(weeks.top.map((t) => t.label)).toEqual(['W42', 'W43']);
    expect(weeks.bottom[0]!.label).toBe('8'); // days 1, 8, 15… of the month
  });
});
