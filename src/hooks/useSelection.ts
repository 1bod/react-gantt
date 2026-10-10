import { useCallback, useMemo, useRef, useState } from 'react';
import { nextSelection, type SelectionAction } from '../core/selection';

/**
 * Selected bar ids, controlled (`value` + `onChange`) or internal when only `onChange` is given.
 * The dispatcher only calls `onChange` when the selection actually changes.
 */
export function useSelection(
  value: readonly string[] | undefined,
  onChange?: (ids: string[]) => void,
): [ReadonlySet<string>, (action: SelectionAction) => void] {
  const [internal, setInternal] = useState<readonly string[]>([]);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;

  const currentRef = useRef(current);
  currentRef.current = current;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const dispatch = useCallback(
    (action: SelectionAction) => {
      const next = nextSelection(currentRef.current, action);
      if (next === currentRef.current) return;
      currentRef.current = next;
      if (!isControlled) setInternal(next);
      onChangeRef.current?.(next.slice());
    },
    [isControlled],
  );

  const set = useMemo(() => new Set(current), [current]);
  return [set, dispatch];
}
