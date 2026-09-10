import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Gantt,
  applyTaskChange,
  applyTaskChanges,
  type DragPreview,
  type GanttHandle,
  type GanttTask,
  type ParentMode,
  type SnapMode,
  type TaskChange,
  type ZoomLevel,
} from '@1bod/react-gantt';
import { BASE, fixedTasks, generateTasks, type DemoData } from './data';

interface LogEntry {
  at: number;
  kind: 'change' | 'commit' | 'rejected';
  changes: TaskChange[];
}

const FR_LABELS = {
  commit: 'Valider',
  discard: 'Annuler',
  pendingChanges: (n: number) => `${n} modification${n > 1 ? 's' : ''} en attente`,
  expand: 'Déplier',
  collapse: 'Replier',
};

function serialize(change: TaskChange) {
  return {
    id: change.id,
    reason: change.reason,
    start: change.start.toISO(),
    end: change.end.toISO(),
    previousStart: change.previousStart.toISO(),
    previousEnd: change.previousEnd.toISO(),
    position: change.position ?? null,
    previousPosition: change.previousPosition,
  };
}

export function App() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [dataset, setDataset] = useState<'fixed' | 'big'>(params.get('dataset') === 'big' ? 'big' : 'fixed');
  const [tasks, setTasks] = useState<GanttTask<DemoData>[]>(() => (dataset === 'big' ? generateTasks(3000) : fixedTasks()));
  const [zoom, setZoom] = useState<ZoomLevel>((params.get('zoom') as ZoomLevel) || 'hour');
  const [snap, setSnap] = useState<SnapMode>((params.get('snap') as SnapMode) || 'hour');
  const [snapToTasks, setSnapToTasks] = useState(params.get('snapToTasks') !== 'false');
  const [parentMode, setParentMode] = useState<ParentMode>('independent');
  const [draft, setDraft] = useState(params.get('draft') === 'true');
  const [readOnly, setReadOnly] = useState(false);
  const [rejectMoves, setRejectMoves] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [preview, setPreview] = useState<DragPreview | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>(['dev']);
  const ref = useRef<GanttHandle>(null);
  // Exposed for the e2e tests (scrollToTask, pending changes…).
  useEffect(() => {
    (window as Window & { gantt?: GanttHandle | null }).gantt = ref.current;
  });

  const switchDataset = (next: 'fixed' | 'big') => {
    setDataset(next);
    setTasks(next === 'big' ? generateTasks(3000) : fixedTasks());
    setLog([]);
  };

  const handleChange = (change: TaskChange) => {
    if (rejectMoves && change.reason === 'move') {
      setLog((prev) => [{ at: Date.now(), kind: 'rejected', changes: [change] }, ...prev]);
      return false;
    }
    setTasks((prev) => applyTaskChange(prev, change));
    setLog((prev) => [{ at: Date.now(), kind: 'change', changes: [change] }, ...prev]);
    return true;
  };

  const handleCommit = (changes: TaskChange[]) => {
    setTasks((prev) => applyTaskChanges(prev, changes));
    setLog((prev) => [{ at: Date.now(), kind: 'commit', changes }, ...prev]);
  };

  return (
    <div className="flex h-screen flex-col gap-3 bg-slate-100 p-4 text-slate-900">
      <header className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
        <h1 className="mr-4 text-lg font-semibold">@1bod/react-gantt</h1>
        <label className="flex items-center gap-1 text-sm">
          Données
          <select data-testid="dataset" className="rounded border px-1 py-0.5" value={dataset} onChange={(e) => switchDataset(e.target.value as 'fixed' | 'big')}>
            <option value="fixed">Projet (9 tâches)</option>
            <option value="big">3000 lignes</option>
          </select>
        </label>
        <label className="flex items-center gap-1 text-sm">
          Zoom
          <select data-testid="zoom" className="rounded border px-1 py-0.5" value={zoom} onChange={(e) => setZoom(e.target.value as ZoomLevel)}>
            <option value="hour">Heure</option>
            <option value="day">Jour</option>
            <option value="week">Semaine</option>
            <option value="month">Mois</option>
          </select>
        </label>
        <label className="flex items-center gap-1 text-sm">
          Snap
          <select
            data-testid="snap"
            className="rounded border px-1 py-0.5"
            value={typeof snap === 'number' ? '15min' : snap}
            onChange={(e) => setSnap(e.target.value === '15min' ? 15 * 60_000 : (e.target.value as SnapMode))}
          >
            <option value="none">Aucun</option>
            <option value="minute">Minute</option>
            <option value="15min">15 minutes</option>
            <option value="hour">Heure</option>
            <option value="day">Jour</option>
          </select>
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input data-testid="snapToTasks" type="checkbox" checked={snapToTasks} onChange={(e) => setSnapToTasks(e.target.checked)} />
          Aimanter aux tâches
        </label>
        <label className="flex items-center gap-1 text-sm">
          Parents
          <select data-testid="parentMode" className="rounded border px-1 py-0.5" value={parentMode} onChange={(e) => setParentMode(e.target.value as ParentMode)}>
            <option value="independent">A · indépendant</option>
            <option value="inline">B · enfants sur la ligne</option>
          </select>
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input data-testid="draft" type="checkbox" checked={draft} onChange={(e) => setDraft(e.target.checked)} />
          Mode brouillon
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input data-testid="readOnly" type="checkbox" checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} />
          Lecture seule
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input data-testid="reject" type="checkbox" checked={rejectMoves} onChange={(e) => setRejectMoves(e.target.checked)} />
          Refuser les déplacements
        </label>
        <button type="button" className="rounded border px-2 py-0.5 text-sm hover:bg-slate-50" onClick={() => ref.current?.scrollToTime(BASE)}>
          Aller au début
        </button>
      </header>

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="min-w-0 flex-1 overflow-hidden rounded-lg bg-white shadow-sm">
          <Gantt<DemoData>
            ref={ref}
            tasks={tasks}
            zoom={zoom}
            onZoomChange={setZoom}
            zone="Europe/Paris"
            range={dataset === 'big' ? { start: BASE.minus({ days: 1 }), end: BASE.plus({ days: 33 }) } : { start: BASE.minus({ hours: 2 }), end: BASE.plus({ hours: 50 }) }}
            locale="fr"
            snap={snap}
            snapToTasks={snapToTasks}
            parentMode={parentMode}
            expandedIds={expandedIds}
            onExpandedChange={setExpandedIds}
            readOnly={readOnly}
            draft={draft}
            onTaskChange={handleChange}
            onDraftCommit={handleCommit}
            onDragPreview={setPreview}
            height="100%"
            now={BASE.plus({ hours: 12 })}
            labels={FR_LABELS}
            renderBar={({ task, start, end, isGroup }) => (
              <span className="flex items-center gap-1">
                {isGroup && <span aria-hidden>▣</span>}
                <span className="truncate">{task.label}</span>
                <span className="opacity-70">{`${start.toFormat('HH:mm')}–${end.toFormat('HH:mm')}`}</span>
              </span>
            )}
            renderLabel={({ task }) => (
              <span className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: task.color ?? '#3b82f6' }} />
                <span className="truncate">{task.label}</span>
                {task.data?.kind && <span className="rounded bg-slate-100 px-1 text-[10px] uppercase text-slate-500">{task.data.kind}</span>}
              </span>
            )}
          />
        </div>

        <aside className="flex w-80 shrink-0 flex-col gap-2 overflow-hidden rounded-lg bg-white p-3 text-xs shadow-sm">
          <div className="font-semibold">Aperçu du drag</div>
          <pre data-testid="preview" className="min-h-[4rem] overflow-auto rounded bg-slate-50 p-2">
            {preview
              ? JSON.stringify(
                  { id: preview.id, reason: preview.reason, start: preview.start.toFormat('dd/MM HH:mm'), end: preview.end.toFormat('dd/MM HH:mm'), snappedTo: preview.snappedTo, position: preview.position },
                  null,
                  1,
                )
              : '—'}
          </pre>
          <div className="flex items-center justify-between font-semibold">
            <span>Événements ({log.length})</span>
            <button type="button" className="rounded border px-1 hover:bg-slate-50" onClick={() => setLog([])}>
              Vider
            </button>
          </div>
          <ol data-testid="log" className="flex-1 space-y-1 overflow-auto">
            {log.map((entry, i) => (
              <li key={`${entry.at}-${i}`} data-testid="log-entry" data-kind={entry.kind} className="rounded bg-slate-50 p-2">
                <div className="mb-1 font-medium">
                  {entry.kind === 'commit' ? `commit (${entry.changes.length})` : entry.kind === 'rejected' ? 'refusé' : 'onTaskChange'}
                </div>
                <pre className="overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(entry.changes.map(serialize), null, 1)}</pre>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
