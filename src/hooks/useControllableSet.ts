import { useCallback, useMemo, useRef, useState } from 'react';

/**
 * A Set of ids that is either controlled (`value` + `onChange`) or uncontrolled (`defaultValue`).
 */
export function useControllableSet(
  value: readonly string[] | undefined,
  defaultValue: readonly string[] | undefined,
  onChange?: (ids: string[]) => void,
): [ReadonlySet<string>, (id: string, force?: boolean) => void] {
  const [internal, setInternal] = useState<ReadonlySet<string>>(() => new Set(defaultValue ?? []));
  const isControlled = value !== undefined;
  const controlledSet = useMemo(() => (value ? new Set(value) : null), [value]);
  const current = isControlled && controlledSet ? controlledSet : internal;

  const currentRef = useRef(current);
  currentRef.current = current;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const toggle = useCallback(
    (id: string, force?: boolean) => {
      const prev = currentRef.current;
      const shouldHave = force ?? !prev.has(id);
      if (shouldHave === prev.has(id)) return;
      const next = new Set(prev);
      if (shouldHave) next.add(id);
      else next.delete(id);
      if (!isControlled) setInternal(next);
      onChangeRef.current?.(Array.from(next));
    },
    [isControlled],
  );

  return [current, toggle];
}
