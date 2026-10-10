import { describe, expect, it } from 'vitest';
import { nextSelection } from './selection';

describe('nextSelection', () => {
  it('a click selects one bar', () => {
    expect(nextSelection([], { type: 'select', id: 'a' })).toEqual(['a']);
    expect(nextSelection(['a', 'b'], { type: 'select', id: 'c' })).toEqual(['c']);
    expect(nextSelection(['a', 'b'], { type: 'select', id: 'a' })).toEqual(['a']);
  });

  it('returns the same array when the selection does not change', () => {
    const current = ['a'];
    expect(nextSelection(current, { type: 'select', id: 'a' })).toBe(current);
    const empty: string[] = [];
    expect(nextSelection(empty, { type: 'clear' })).toBe(empty);
  });

  it('an additive click toggles, keeping the order of selection', () => {
    expect(nextSelection(['a'], { type: 'select', id: 'b', additive: true })).toEqual(['a', 'b']);
    expect(nextSelection(['a', 'b'], { type: 'select', id: 'a', additive: true })).toEqual(['b']);
    expect(nextSelection([], { type: 'select', id: 'a', additive: true })).toEqual(['a']);
  });

  it('clear empties the selection', () => {
    expect(nextSelection(['a', 'b'], { type: 'clear' })).toEqual([]);
  });
});
