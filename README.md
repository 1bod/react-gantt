# @1bod/react-gantt

Composant Gantt React hautement personnalisable : sous-tâches en accordéon, déplacement et
redimensionnement des tâches avec snap (minute, heure, jour, ou début/fin des tâches voisines),
déplacement vertical entre lignes, mode brouillon, virtualisation pour des milliers de lignes.

- Rendu HTML (pas de canvas) : tout est stylable par CSS variables, `classNames` et render props.
- Composant **contrôlé** : il ne modifie jamais `tasks`, il émet des `TaskChange` que l'app applique.
- Dates gérées avec [Luxon](https://moment.github.io/luxon/), styles Tailwind précompilés.

> Le package n'est **pas publié** sur npm (`"private": true`). À consommer via git / workspace pour l'instant.

## Installation

```bash
npm install @1bod/react-gantt luxon
```

```tsx
import { Gantt, applyTaskChange, type GanttTask, type TaskChange } from '@1bod/react-gantt';
import '@1bod/react-gantt/styles.css';

const initial: GanttTask[] = [
  { id: 'spec', label: 'Spécification', start: '2026-01-05T08:00', end: '2026-01-05T12:00', color: '#2563eb' },
  {
    id: 'dev',
    label: 'Développement',
    start: '2026-01-05T13:00',
    end: '2026-01-07T18:00',
    children: [
      { id: 'api', label: 'API', start: '2026-01-05T13:00', end: '2026-01-06T12:00' },
      { id: 'ui', label: 'UI', start: '2026-01-06T09:00', end: '2026-01-07T18:00' },
    ],
  },
];

function Planning() {
  const [tasks, setTasks] = useState(initial);
  return (
    <Gantt
      tasks={tasks}
      zoom="day"
      snap="hour"
      onTaskChange={(change: TaskChange) => setTasks((prev) => applyTaskChange(prev, change))}
      height={600}
    />
  );
}
```

## Modèle

```ts
interface GanttTask<TData = unknown> {
  id: string;
  label: ReactNode;          // contenu affiché dans la colonne de gauche et dans la barre
  start: Date | DateTime | string | number;
  end: Date | DateTime | string | number;
  color?: string;            // couleur CSS de la barre
  children?: GanttTask[];    // un seul niveau de sous-tâches
  parentMode?: 'independent' | 'inline'; // surcharge de la prop `parentMode`
  data?: TData;              // données libres, renvoyées dans les render props
}
```

### Tâches parentes : deux modes d'affichage

- `independent` (mode A) : le parent a sa propre barre, totalement décorrélée de ses enfants.
  Ses dates sont celles du JSON. Cliquer sur la barre ou le chevron déplie les enfants sous lui.
- `inline` (mode B) : le parent n'a pas de barre, ses enfants sont dessinés côte à côte sur sa
  ligne et sont déplaçables directement. Déplier la ligne montre en plus chaque enfant sur sa
  propre ligne.

La prop `parentMode` fixe le défaut, `task.parentMode` le surcharge par tâche.

## Événements

Le composant est contrôlé. À chaque interaction terminée il appelle `onTaskChange(change)` :

```ts
interface TaskChange {
  id: string;
  start: DateTime;             // Luxon
  end: DateTime;
  previousStart: DateTime;
  previousEnd: DateTime;
  reason: 'move' | 'resize-start' | 'resize-end' | 'keyboard';
  position?: { parentId: string | null; index: number }; // présent seulement si la ligne a changé
  previousPosition: { parentId: string | null; index: number };
}
```

- Retourner `false` depuis `onTaskChange` refuse le changement (la barre revient à sa place
  puisque `tasks` n'a pas changé).
- `applyTaskChange(tasks, change)` et `applyTaskChanges(tasks, changes)` sont fournis pour
  appliquer un changement (dates + déplacement vertical : réordonner, imbriquer, désimbriquer).
- `position.index` est l'index final de la tâche parmi ses frères, après retrait de son ancienne
  place. Une tâche déposée sur une ligne prend la place de cette ligne. Une tâche qui a des enfants
  ne peut pas être imbriquée : déposée sur une ligne enfant, elle prend la place du parent.
- `onDragPreview(preview | null)` est appelé en continu pendant le drag, puis avec `null`.

## Snap

| Prop              | Défaut   | Rôle                                                                 |
| ----------------- | -------- | -------------------------------------------------------------------- |
| `snap`            | `'hour'` | `'minute' \| 'hour' \| 'day' \| 'none' \| <ms>` : grille de temps    |
| `snapToTasks`     | `true`   | aimante aux débuts/fins des autres tâches                            |
| `snapThresholdPx` | `8`      | rayon de l'aimant en pixels ; l'aimant gagne sur la grille           |
| `minDuration`     | 1 unité  | durée minimale en ms lors d'un redimensionnement                     |

Les grilles `hour` et `day` sont calculées avec Luxon dans la zone `zone` (DST géré).

## Mode brouillon

```tsx
<Gantt
  draft
  tasks={tasks}
  onDraftChange={(changes) => console.log(changes.length, 'en attente')}
  onDraftCommit={(changes) => setTasks((prev) => applyTaskChanges(prev, changes))}
  labels={{ commit: 'Valider', discard: 'Annuler', pendingChanges: (n) => `${n} modifications` }}
/>
```

En mode `draft`, les changements ne sont pas émis mais accumulés et affichés en aperçu (barre
pointillée + fantôme à l'ancienne place). La barre d'outils intégrée permet de valider ou annuler ;
`renderDraftToolbar` la remplace, et le `ref` expose `commitDraft()`, `discardDraft()`,
`getPendingChanges()`.

## Clavier

Une barre est focusable. `←`/`→` déplacent d'une unité de snap, `Shift+←/→` redimensionnent la fin,
`Alt+←/→` le début, `↑`/`↓` changent de ligne, `Entrée`/`Espace` déplient un parent, `Échap` annule
un drag en cours.

## Personnalisation

- **CSS variables** sur `.gantt-root` : `--gantt-row-height`, `--gantt-bar-color`, `--gantt-bar-text`,
  `--gantt-grid-color`, `--gantt-grid-major-color`, `--gantt-bg`, `--gantt-row-alt-bg`,
  `--gantt-row-hover-bg`, `--gantt-text`, `--gantt-muted`, `--gantt-pending-color`,
  `--gantt-drop-color`, `--gantt-font`.
- **`classNames`** : une classe additionnelle par slot (`root`, `header`, `row`, `rowGroup`, `bar`,
  `barGroup`, `barChild`, `barPending`, `handle`, `ghost`, `draftToolbar`…).
- **Render props** : `renderBar`, `renderLabel`, `renderHeaderCell`, `renderDraftToolbar`,
  `barClassName(task)`, `barStyle(task)`.
- **Attributs data** pour cibler en CSS ou en test : `[data-gantt="bar"][data-task-id]`,
  `[data-gantt="row"][data-kind="group"]`, `[data-dragging]`, `[data-pending]`, `[data-drop-target]`.

Autres props : `zoom` / `onZoomChange` (Ctrl + molette), `range`, `zone`, `locale`, `columnWidth`,
`rowHeight`, `sidebarWidth`, `headerHeight`, `height`, `overscan`, `readOnly`, `allowVerticalMove`,
`allowResize`, `expandedIds` / `defaultExpandedIds` / `onExpandedChange`, `showNow` / `now`,
`onTaskClick`.

## Développement

```bash
npm run dev          # démo sur http://localhost:5173
npm test             # tests unitaires + composant (Vitest, jsdom)
npm run test:e2e     # Playwright sur la démo (vrai navigateur)
npm run build        # dist/ (ESM, CJS, types, styles.css)
```

Stratégie de tests :

- `src/core/*.test.ts` : moteur pur (snap, drag, lignes, virtualisation, en-têtes, application des changements).
- `src/components/Gantt.test.tsx` : composant avec Testing Library, pointer events simulés.
- `e2e/*.spec.ts` : vrais drags souris dans Chromium sur la démo, incluant la virtualisation.
