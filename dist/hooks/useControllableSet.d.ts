/**
 * A Set of ids that is either controlled (`value` + `onChange`) or uncontrolled (`defaultValue`).
 */
export declare function useControllableSet(value: readonly string[] | undefined, defaultValue: readonly string[] | undefined, onChange?: (ids: string[]) => void): [ReadonlySet<string>, (id: string, force?: boolean) => void];
