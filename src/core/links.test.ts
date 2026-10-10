import { describe, expect, it } from 'vitest';
import type { GanttLink } from '../types';
import { linkPath, selectLinks, type BarRect } from './links';

// Bars of 20px, 4px below the top of 28px rows.
const bar = (x: number, width: number, row: number): BarRect => ({ x, y: row * 28 + 4, width, height: 20 });

describe('linkPath', () => {
  it('finish_start: out of the end, elbow, into the start', () => {
    const { path, arrow } = linkPath(bar(0, 100, 0), bar(200, 50, 2));
    expect(path).toBe('M100.5 14.5 L108.5 14.5 L108.5 70.5 L200.5 70.5');
    expect(arrow).toBe('M200.5 70.5 L196.5 67.5 L196.5 73.5 Z');
  });

  it('finish_start on the same row is a straight line', () => {
    expect(linkPath(bar(0, 100, 1), bar(150, 50, 1)).path).toBe('M100.5 42.5 L108.5 42.5 L150.5 42.5');
  });

  it('finish_start goes around when the successor starts too early', () => {
    // Successor below, starting before the predecessor ends: detour at mid height.
    expect(linkPath(bar(0, 100, 0), bar(90, 50, 1)).path).toBe(
      'M100.5 14.5 L108.5 14.5 L108.5 28.5 L82.5 28.5 L82.5 42.5 L90.5 42.5',
    );
    // Same row (an overlap on another lane would differ): detour under the bars.
    expect(linkPath(bar(0, 100, 0), bar(50, 20, 0)).path).toBe(
      'M100.5 14.5 L108.5 14.5 L108.5 28.5 L42.5 28.5 L42.5 14.5 L50.5 14.5',
    );
  });

  it('start_start leaves and enters on the left', () => {
    const { path, arrow } = linkPath(bar(40, 100, 0), bar(10, 50, 1), 'start_start');
    expect(path).toBe('M40.5 14.5 L2.5 14.5 L2.5 42.5 L10.5 42.5');
    expect(arrow).toBe('M10.5 42.5 L6.5 39.5 L6.5 45.5 Z');
  });

  it('finish_finish leaves and enters on the right, the arrow points left', () => {
    const { path, arrow } = linkPath(bar(0, 100, 1), bar(0, 120, 0), 'finish_finish', 10);
    expect(path).toBe('M100.5 42.5 L130.5 42.5 L130.5 14.5 L120.5 14.5');
    expect(arrow).toBe('M120.5 14.5 L124.5 11.5 L124.5 17.5 Z');
  });

  it('only uses horizontal and vertical segments', () => {
    const geometry = linkPath({ x: 13.3, y: 7.7, width: 41.2, height: 19 }, { x: 31.9, y: 77.1, width: 10, height: 19 });
    const points = geometry.path.split(/[ML]/).filter(Boolean).map((p) => p.trim().split(' ').map(Number));
    for (let i = 1; i < points.length; i++) {
      const [ax, ay] = points[i - 1]!;
      const [bx, by] = points[i]!;
      expect(ax === bx || ay === by).toBe(true);
    }
  });
});

describe('selectLinks', () => {
  const links: GanttLink[] = [
    { id: 'l1', from: 'a', to: 'b' },
    { id: 'l2', from: 'b', to: 'c' },
    { id: 'l3', from: 'd', to: 'e' },
  ];

  it('selected: the links touching a selected bar', () => {
    expect(selectLinks(links, 'selected', new Set(['b'])).map((l) => l.id)).toEqual(['l1', 'l2']);
    expect(selectLinks(links, 'selected', new Set(['e'])).map((l) => l.id)).toEqual(['l3']);
    expect(selectLinks(links, 'selected', new Set())).toEqual([]);
  });

  it('all / none', () => {
    expect(selectLinks(links, 'all', new Set())).toEqual(links);
    expect(selectLinks(links, 'none', new Set(['a']))).toEqual([]);
  });
});
