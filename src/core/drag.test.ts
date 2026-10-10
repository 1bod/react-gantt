import { describe, expect, it } from 'vitest';
import { computeDrag, computeKeyboardStep, type DragInput } from './drag';
import type { SnapContext } from './snap';
import { createTimeScale, DAY, HOUR, MINUTE } from './time';

const T0 = Date.UTC(2026, 0, 5, 0, 0, 0);
// 60px per hour, so 1px = 1 minute. Handy for reasoning about pixel deltas.
const scale = createTimeScale(T0, T0 + 10 * DAY, 'hour', 60);

const noSnap: SnapContext = { snap: 'none', edges: [], edgeThresholdMs: 0, zone: 'utc' };

function input(overrides: Partial<DragInput> = {}): DragInput {
  return {
    kind: 'move',
    originStart: T0 + 10 * HOUR,
    originEnd: T0 + 12 * HOUR,
    deltaPx: 0,
    deltaY: 0,
    originRowIndex: 3,
    rowCount: 10,
    rowHeight: 36,
    scale,
    snap: noSnap,
    minDurationMs: 15 * MINUTE,
    allowVertical: true,
    ...overrides,
  };
}

describe('computeDrag / move', () => {
  it('translates the whole task and keeps the duration', () => {
    const r = computeDrag(input({ deltaPx: 90 }));
    expect(r.start).toBe(T0 + 11.5 * HOUR);
    expect(r.end).toBe(T0 + 13.5 * HOUR);
    expect(r.snappedTo).toBe('none');
  });

  it('accepts negative deltas', () => {
    const r = computeDrag(input({ deltaPx: -30 }));
    expect(r.start).toBe(T0 + 9.5 * HOUR);
    expect(r.end).toBe(T0 + 11.5 * HOUR);
  });

  it('snaps the start to the hour grid', () => {
    const r = computeDrag(input({ deltaPx: 29, snap: { ...noSnap, snap: 'hour' } }));
    expect(r.start).toBe(T0 + 10 * HOUR);
    expect(r.snappedTo).toBe('grid');
    const r2 = computeDrag(input({ deltaPx: 31, snap: { ...noSnap, snap: 'hour' } }));
    expect(r2.start).toBe(T0 + 11 * HOUR);
    expect(r2.end).toBe(T0 + 13 * HOUR);
  });

  it('snaps to the minute grid', () => {
    const r = computeDrag(input({ deltaPx: 12.4, snap: { ...noSnap, snap: 'minute' } }));
    expect(r.start).toBe(T0 + 10 * HOUR + 12 * MINUTE);
    expect(r.snappedTo).toBe('grid');
  });

  it('magnetises the start to a neighbouring edge', () => {
    const edge = T0 + 11 * HOUR + 3 * MINUTE;
    const r = computeDrag(input({ deltaPx: 60, snap: { snap: 'hour', edges: [edge], edgeThresholdMs: 5 * MINUTE } }));
    expect(r.start).toBe(edge);
    expect(r.end).toBe(edge + 2 * HOUR);
    expect(r.snappedTo).toBe('edge');
  });

  it('magnetises the end to a neighbouring edge when the end is closer', () => {
    // Moving by 60px puts the end at 13:00. An edge at 13:02 attracts the end.
    const edge = T0 + 13 * HOUR + 2 * MINUTE;
    const r = computeDrag(input({ deltaPx: 60, snap: { snap: 'hour', edges: [edge], edgeThresholdMs: 5 * MINUTE } }));
    expect(r.end).toBe(edge);
    expect(r.start).toBe(edge - 2 * HOUR);
    expect(r.snappedTo).toBe('edge');
  });

  it('uses whichever edge is closest when both start and end have candidates', () => {
    const startEdge = T0 + 11 * HOUR + 4 * MINUTE; // 4 min from raw start 11:00
    const endEdge = T0 + 13 * HOUR + 1 * MINUTE; // 1 min from raw end 13:00
    const r = computeDrag(
      input({ deltaPx: 60, snap: { snap: 'hour', edges: [startEdge, endEdge], edgeThresholdMs: 5 * MINUTE } }),
    );
    expect(r.end).toBe(endEdge);
  });

  it('prefers the start edge on a tie', () => {
    const startEdge = T0 + 11 * HOUR + 2 * MINUTE;
    const endEdge = T0 + 13 * HOUR + 2 * MINUTE;
    const r = computeDrag(
      input({ deltaPx: 60, snap: { snap: 'hour', edges: [startEdge, endEdge], edgeThresholdMs: 5 * MINUTE } }),
    );
    expect(r.start).toBe(startEdge);
  });

  it('ignores edges outside the threshold and falls back to the grid', () => {
    const edge = T0 + 11 * HOUR + 10 * MINUTE;
    const r = computeDrag(input({ deltaPx: 60, snap: { snap: 'hour', edges: [edge], edgeThresholdMs: 5 * MINUTE } }));
    expect(r.start).toBe(T0 + 11 * HOUR);
    expect(r.snappedTo).toBe('grid');
  });

  it('disables edge snapping when the threshold is 0', () => {
    const edge = T0 + 11 * HOUR + 1 * MINUTE;
    const r = computeDrag(input({ deltaPx: 60, snap: { snap: 'none', edges: [edge], edgeThresholdMs: 0 } }));
    expect(r.start).toBe(T0 + 11 * HOUR);
    expect(r.snappedTo).toBe('none');
  });

  it('returns the raw position with snap none and no edge in range', () => {
    const r = computeDrag(input({ deltaPx: 7, snap: { snap: 'none', edges: [T0], edgeThresholdMs: MINUTE } }));
    expect(r.start).toBe(T0 + 10 * HOUR + 7 * MINUTE);
    expect(r.snappedTo).toBe('none');
  });
});

describe('computeDrag / vertical', () => {
  it('changes row after half a row height', () => {
    expect(computeDrag(input({ deltaY: 17 })).rowIndex).toBe(3);
    expect(computeDrag(input({ deltaY: 18 })).rowIndex).toBe(4);
    expect(computeDrag(input({ deltaY: 36 * 2 + 10 })).rowIndex).toBe(5);
    expect(computeDrag(input({ deltaY: -18 })).rowIndex).toBe(2);
  });

  it('clamps to the row range', () => {
    expect(computeDrag(input({ deltaY: -1000 })).rowIndex).toBe(0);
    expect(computeDrag(input({ deltaY: 1000 })).rowIndex).toBe(9);
  });

  it('keeps the row when vertical moves are disabled', () => {
    expect(computeDrag(input({ deltaY: 500, allowVertical: false })).rowIndex).toBe(3);
  });

  it('never changes row while resizing', () => {
    expect(computeDrag(input({ kind: 'resize-end', deltaY: 500 })).rowIndex).toBe(3);
    expect(computeDrag(input({ kind: 'resize-start', deltaY: 500 })).rowIndex).toBe(3);
  });

  it('handles an empty row list', () => {
    expect(computeDrag(input({ rowCount: 0, originRowIndex: 0, deltaY: 100 })).rowIndex).toBe(0);
  });
});

describe('computeDrag / resize-start', () => {
  it('moves only the start', () => {
    const r = computeDrag(input({ kind: 'resize-start', deltaPx: 30 }));
    expect(r.start).toBe(T0 + 10.5 * HOUR);
    expect(r.end).toBe(T0 + 12 * HOUR);
  });

  it('snaps the start to the grid', () => {
    const r = computeDrag(input({ kind: 'resize-start', deltaPx: -35, snap: { ...noSnap, snap: 'hour' } }));
    expect(r.start).toBe(T0 + 9 * HOUR);
    expect(r.snappedTo).toBe('grid');
  });

  it('snaps the start to a neighbouring edge', () => {
    const edge = T0 + 9 * HOUR + 3 * MINUTE;
    const r = computeDrag(
      input({ kind: 'resize-start', deltaPx: -60, snap: { snap: 'hour', edges: [edge], edgeThresholdMs: 5 * MINUTE } }),
    );
    expect(r.start).toBe(edge);
    expect(r.snappedTo).toBe('edge');
  });

  it('enforces the minimum duration', () => {
    const r = computeDrag(input({ kind: 'resize-start', deltaPx: 200 }));
    expect(r.start).toBe(T0 + 12 * HOUR - 15 * MINUTE);
    expect(r.end).toBe(T0 + 12 * HOUR);
    expect(r.snappedTo).toBe('none');
  });

  it('enforces the minimum duration even when snapping would cross it', () => {
    const r = computeDrag(input({ kind: 'resize-start', deltaPx: 110, snap: { ...noSnap, snap: 'hour' } }));
    // raw = 11:50 -> grid 12:00 which is past end - min: clamp to 11:45
    expect(r.start).toBe(T0 + 11 * HOUR + 45 * MINUTE);
  });
});

describe('computeDrag / resize-end', () => {
  it('moves only the end', () => {
    const r = computeDrag(input({ kind: 'resize-end', deltaPx: 30 }));
    expect(r.start).toBe(T0 + 10 * HOUR);
    expect(r.end).toBe(T0 + 12.5 * HOUR);
  });

  it('snaps the end to the grid', () => {
    const r = computeDrag(input({ kind: 'resize-end', deltaPx: 31, snap: { ...noSnap, snap: 'hour' } }));
    expect(r.end).toBe(T0 + 13 * HOUR);
  });

  it('snaps the end to a neighbouring edge', () => {
    const edge = T0 + 13 * HOUR + 4 * MINUTE;
    const r = computeDrag(
      input({ kind: 'resize-end', deltaPx: 60, snap: { snap: 'hour', edges: [edge], edgeThresholdMs: 5 * MINUTE } }),
    );
    expect(r.end).toBe(edge);
  });

  it('enforces the minimum duration', () => {
    const r = computeDrag(input({ kind: 'resize-end', deltaPx: -500 }));
    expect(r.start).toBe(T0 + 10 * HOUR);
    expect(r.end).toBe(T0 + 10 * HOUR + 15 * MINUTE);
  });
});

describe('computeDrag / scale', () => {
  it('respects the pixel density of the scale', () => {
    const dayScale = createTimeScale(T0, T0 + 30 * DAY, 'day', 48);
    const r = computeDrag(input({ deltaPx: 96, scale: dayScale }));
    expect(r.start).toBe(T0 + 10 * HOUR + 2 * DAY);
  });
});

describe('computeKeyboardStep', () => {
  const base = { start: T0 + 10 * HOUR, end: T0 + 12 * HOUR, minDurationMs: 15 * MINUTE, zone: 'utc' } as const;

  it('moves by one grid unit when aligned', () => {
    expect(computeKeyboardStep({ ...base, action: 'move', direction: 1, snap: 'hour' })).toEqual({
      start: T0 + 11 * HOUR,
      end: T0 + 13 * HOUR,
    });
    expect(computeKeyboardStep({ ...base, action: 'move', direction: -1, snap: 'hour' })).toEqual({
      start: T0 + 9 * HOUR,
      end: T0 + 11 * HOUR,
    });
  });

  it('lands on the next grid point when not aligned', () => {
    const r = computeKeyboardStep({ ...base, start: T0 + 10 * HOUR + 20 * MINUTE, action: 'move', direction: 1, snap: 'hour' });
    expect(r.start).toBe(T0 + 11 * HOUR);
    const l = computeKeyboardStep({ ...base, start: T0 + 10 * HOUR + 20 * MINUTE, action: 'move', direction: -1, snap: 'hour' });
    expect(l.start).toBe(T0 + 10 * HOUR);
  });

  it('works with the minute grid and custom steps', () => {
    expect(computeKeyboardStep({ ...base, action: 'move', direction: 1, snap: 'minute' }).start).toBe(T0 + 10 * HOUR + MINUTE);
    expect(computeKeyboardStep({ ...base, start: T0 + 10 * HOUR + 7 * MINUTE, action: 'move', direction: 1, snap: 15 * MINUTE }).start).toBe(
      T0 + 10 * HOUR + 15 * MINUTE,
    );
    expect(computeKeyboardStep({ ...base, start: T0 + 10 * HOUR + 7 * MINUTE, action: 'move', direction: -1, snap: 15 * MINUTE }).start).toBe(
      T0 + 10 * HOUR,
    );
  });

  it('falls back to one hour with snap none', () => {
    expect(computeKeyboardStep({ ...base, action: 'move', direction: 1, snap: 'none' }).start).toBe(T0 + 11 * HOUR);
  });

  it('resizes edges with the minimum duration', () => {
    expect(computeKeyboardStep({ ...base, action: 'resize-end', direction: 1, snap: 'hour' })).toEqual({
      start: base.start,
      end: T0 + 13 * HOUR,
    });
    expect(computeKeyboardStep({ ...base, action: 'resize-start', direction: 1, snap: 'hour' })).toEqual({
      start: T0 + 11 * HOUR,
      end: base.end,
    });
    const squeezed = computeKeyboardStep({ ...base, end: T0 + 10 * HOUR + 30 * MINUTE, action: 'resize-end', direction: -1, snap: 'hour' });
    expect(squeezed.end).toBe(T0 + 10 * HOUR + 15 * MINUTE);
    const squeezedStart = computeKeyboardStep({ ...base, start: T0 + 11 * HOUR + 30 * MINUTE, action: 'resize-start', direction: 1, snap: 'hour' });
    expect(squeezedStart.start).toBe(T0 + 11 * HOUR + 45 * MINUTE);
  });

  it('is DST aware for day steps', () => {
    const dayBefore = Date.UTC(2026, 2, 28, 23); // 2026-03-29 00:00 Paris
    const r = computeKeyboardStep({ start: dayBefore, end: dayBefore + HOUR, minDurationMs: 0, zone: 'Europe/Paris', action: 'move', direction: 1, snap: 'day' });
    expect(r.start - dayBefore).toBe(23 * HOUR);
  });
});

describe('computeDrag / variable row heights', () => {
  // Rows of 28, 52 (two lanes), 28 and 28 pixels.
  const rowTops = [0, 28, 80, 108, 136];

  it('targets the row under the anchor', () => {
    // Bar on lane 1 of row 1: its centre is at 28 + 24 + 14 = 66.
    const base = input({ originRowIndex: 1, rowCount: 4, rowTops, anchorY: 66 });
    expect(computeDrag({ ...base, deltaY: 0 }).rowIndex).toBe(1);
    expect(computeDrag({ ...base, deltaY: 13 }).rowIndex).toBe(1);
    expect(computeDrag({ ...base, deltaY: 14 }).rowIndex).toBe(2);
    expect(computeDrag({ ...base, deltaY: -39 }).rowIndex).toBe(0);
  });

  it('clamps to the first and last rows', () => {
    const base = input({ originRowIndex: 1, rowCount: 4, rowTops, anchorY: 40 });
    expect(computeDrag({ ...base, deltaY: -500 }).rowIndex).toBe(0);
    expect(computeDrag({ ...base, deltaY: 500 }).rowIndex).toBe(3);
  });

  it('never changes row while resizing or without allowVertical', () => {
    const base = input({ originRowIndex: 1, rowCount: 4, rowTops, anchorY: 40, deltaY: 60 });
    expect(computeDrag({ ...base, kind: 'resize-end' }).rowIndex).toBe(1);
    expect(computeDrag({ ...base, allowVertical: false }).rowIndex).toBe(1);
  });
});
