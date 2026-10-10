export type SelectionAction = 
/** Click on a bar. `additive` (shift / cmd / ctrl) toggles the bar instead of selecting it alone. */
{
    type: 'select';
    id: string;
    additive?: boolean;
}
/** Escape, or a click on the empty grid. */
 | {
    type: 'clear';
};
/** Next selected ids. Returns `current` itself when nothing changes. */
export declare function nextSelection(current: readonly string[], action: SelectionAction): readonly string[];
