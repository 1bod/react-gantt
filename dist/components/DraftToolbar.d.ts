import type { GanttClassNames, GanttLabels } from '../props';
import type { TaskChange } from '../types';
export interface DraftToolbarProps {
    changes: TaskChange[];
    commit: () => void;
    discard: () => void;
    labels: GanttLabels;
    classNames: GanttClassNames;
}
export declare function DraftToolbar({ changes, commit, discard, labels, classNames: c }: DraftToolbarProps): import("react").JSX.Element;
