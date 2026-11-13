export type SelectionAction =
  /** Click on a bar. `additive` (shift / cmd / ctrl) toggles the bar instead of selecting it alone. */
  | { type: 'select'; id: string; additive?: boolean }
  /** Escape, or a click on the empty grid. */
  | { type: 'clear' };

/** Next selected ids. Returns `current` itself when nothing changes. */
export function nextSelection(current: readonly string[], action: SelectionAction): readonly string[] {
  if (action.type === 'clear') return current.length ? [] : current;
  if (action.additive) {
    return current.includes(action.id) ? current.filter((id) => id !== action.id) : [...current, action.id];
  }
  return current.length === 1 && current[0] === action.id ? current : [action.id];
}
