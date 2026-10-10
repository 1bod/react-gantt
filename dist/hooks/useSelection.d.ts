import { type SelectionAction } from '../core/selection';
/**
 * Selected bar ids, controlled (`value` + `onChange`) or internal when only `onChange` is given.
 * The dispatcher only calls `onChange` when the selection actually changes.
 */
export declare function useSelection(value: readonly string[] | undefined, onChange?: (ids: string[]) => void): [ReadonlySet<string>, (action: SelectionAction) => void];
