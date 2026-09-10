import type { GanttClassNames, GanttLabels } from '../props';
import type { TaskChange } from '../types';

export interface DraftToolbarProps {
  changes: TaskChange[];
  commit: () => void;
  discard: () => void;
  labels: GanttLabels;
  classNames: GanttClassNames;
}

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function DraftToolbar({ changes, commit, discard, labels, classNames: c }: DraftToolbarProps) {
  return (
    <div
      data-gantt="draft-toolbar"
      role="status"
      className={cx(
        'gantt-draft-toolbar absolute right-3 bottom-3 z-50 flex items-center gap-2 rounded-lg border border-[var(--gantt-grid-major-color)] bg-[var(--gantt-bg)] px-3 py-2 text-sm shadow-lg',
        c.draftToolbar,
      )}
    >
      <span className="text-[var(--gantt-muted)]">{labels.pendingChanges(changes.length)}</span>
      <button
        type="button"
        onClick={discard}
        className={cx('gantt-draft-button rounded-md border border-[var(--gantt-grid-major-color)] px-2 py-1 hover:bg-black/5', c.draftButton)}
      >
        {labels.discard}
      </button>
      <button
        type="button"
        onClick={commit}
        className={cx(
          'gantt-draft-button gantt-draft-button-primary rounded-md bg-[var(--gantt-drop-color)] px-2 py-1 text-white hover:opacity-90',
          c.draftButton,
          c.draftButtonPrimary,
        )}
      >
        {labels.commit}
      </button>
    </div>
  );
}
