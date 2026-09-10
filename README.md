# @1bod/react-gantt

Un composant Gantt React **ultra personnalisable**, pensé pour être réutilisé dans plusieurs
applications :

- **Sous-tâches en accordéon** : un clic sur une tâche parente déplie ses sous-tâches. Deux modes
  d'affichage des parents (barre indépendante, ou enfants alignés sur la ligne du parent).
- **Déplacement et redimensionnement** à la souris, au doigt (pointer events) et au clavier, avec
  **snap** à la minute, à l'heure, au jour, à un pas personnalisé, et **aimant sur le début/fin des
  tâches voisines**.
- **Déplacement vertical** entre lignes : réordonner, imbriquer dans un parent, sortir d'un parent.
- **Mode brouillon** : les modifications sont prévisualisées et validées d'un coup.
- **Virtualisation** : des milliers de lignes sans ralentissement.
- **Composant contrôlé** : il ne modifie jamais vos données, il émet des événements.
- Rendu **HTML** (pas de canvas) : tout est stylable via CSS variables, classes et render props.
- Dates avec [Luxon](https://moment.github.io/luxon/), styles **Tailwind** précompilés (aucune
  configuration Tailwind requise côté application).

> **Statut** : `1.0.0`, dépôt privé. Le package n'est pas publié sur npm (`"private": true`),
> installez-le depuis Git.

---

## Sommaire

1. [Installation](#installation)
2. [Premier exemple](#premier-exemple)
3. [Modèle de données](#modèle-de-données)
4. [Tâches parentes et sous-tâches](#tâches-parentes-et-sous-tâches)
5. [Déplacements et événements](#déplacements-et-événements)
6. [Snap](#snap)
7. [Mode brouillon](#mode-brouillon)
8. [Échelle de temps, zoom et plage](#échelle-de-temps-zoom-et-plage)
9. [Clavier et accessibilité](#clavier-et-accessibilité)
10. [Personnalisation](#personnalisation)
11. [Référence des props](#référence-des-props)
12. [Ref impérative](#ref-impérative)
13. [Utilitaires exportés](#utilitaires-exportés)
14. [Recettes](#recettes)
15. [Développement et tests](#développement-et-tests)

---

## Installation

```bash
npm install github:1bod/react-gantt#v1.0.0 luxon
```

`react` et `react-dom` (>= 18) sont des peer dependencies.

Le dossier `dist/` n'est pas commité : le script `prepare` construit le package automatiquement
lors d'une installation depuis Git. Dans un monorepo, ajoutez le dépôt comme package local, ou
pointez un alias Vite vers `src/index.ts` (c'est ce que fait la démo, voir
[demo/vite.config.ts](demo/vite.config.ts)).

Importez ensuite le composant **et sa feuille de style** :

```tsx
import { Gantt } from '@1bod/react-gantt';
import '@1bod/react-gantt/styles.css';
```

La feuille de style ne contient que les utilitaires Tailwind utilisés par le composant et ses
variables CSS : elle ne réinitialise rien dans votre application.

---

## Premier exemple

```tsx
import { useState } from 'react';
import { Gantt, applyTaskChange, type GanttTask, type TaskChange } from '@1bod/react-gantt';
import '@1bod/react-gantt/styles.css';

const initial: GanttTask[] = [
  { id: 'spec', label: 'Spécification', start: '2026-01-05T08:00', end: '2026-01-05T12:00', color: '#2563eb' },
  {
    id: 'dev',
    label: 'Développement',
    start: '2026-01-05T13:00',
    end: '2026-01-07T18:00',
    color: '#16a34a',
    children: [
      { id: 'api', label: 'API', start: '2026-01-05T13:00', end: '2026-01-06T12:00' },
      { id: 'ui', label: 'Interface', start: '2026-01-06T09:00', end: '2026-01-07T18:00' },
    ],
  },
  { id: 'recette', label: 'Recette', start: '2026-01-08T09:00', end: '2026-01-08T17:00', color: '#f59e0b' },
];

export function Planning() {
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

Le Gantt affiche les tâches, l'utilisateur déplace une barre, `onTaskChange` reçoit le changement,
`applyTaskChange` produit le nouveau tableau, React re-rend. Le composant ne touche jamais à
`tasks` lui-même.

---

## Modèle de données

```ts
interface GanttTask<TData = unknown> {
  id: string;
  /** Contenu affiché dans la colonne de gauche et dans la barre (texte ou JSX). */
  label: ReactNode;
  start: Date | DateTime | string | number; // Date, Luxon DateTime, ISO 8601 ou timestamp ms
  end: Date | DateTime | string | number;
  /** Couleur CSS de la barre. Par défaut la variable --gantt-bar-color. */
  color?: string;
  /** Sous-tâches. Un seul niveau d'imbrication. */
  children?: GanttTask<TData>[];
  /** Surcharge, pour cette tâche, du mode d'affichage des parents. */
  parentMode?: 'independent' | 'inline';
  /** Données libres, renvoyées telles quelles dans les render props et les événements. */
  data?: TData;
}
```

Les dates sont acceptées dans n'importe lequel de ces formats en entrée. En sortie (événements,
render props) elles sont toujours des `DateTime` Luxon dans la zone `zone` du composant.

Le paramètre générique `TData` type la propriété `data` :

```tsx
interface Meta { owner: string; priority: 1 | 2 | 3 }
<Gantt<Meta> tasks={tasks} renderBar={({ task }) => task.data?.owner} />
```

---

## Tâches parentes et sous-tâches

Une tâche est un **parent** dès qu'elle a au moins un enfant dans `children`. Cliquer sur sa barre
(sans la déplacer), sur son libellé ou sur le chevron déplie l'accordéon : chaque enfant apparaît
sur sa propre ligne, indentée. Les enfants sont eux-mêmes déplaçables et redimensionnables.

Deux modes d'affichage, choisis globalement par la prop `parentMode` et surchargeables par tâche
avec `task.parentMode` :

| Mode                        | Comportement                                                                                                                                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `independent` (par défaut)  | Le parent a **sa propre barre**, totalement décorrélée des enfants. Ses dates sont celles du JSON, elles peuvent ne rien avoir à voir avec celles des enfants. La déplacer ne déplace pas les enfants, et inversement. |
| `inline`                    | Le parent **n'a pas de barre**. Ses enfants sont dessinés côte à côte sur la ligne du parent et sont déplaçables directement depuis cette ligne. Déplier montre en plus chaque enfant sur sa propre ligne.            |

L'état déplié/replié est soit interne (`defaultExpandedIds`), soit contrôlé
(`expandedIds` + `onExpandedChange`).

```tsx
<Gantt tasks={tasks} parentMode="inline" defaultExpandedIds={['dev']} />
```

---

## Déplacements et événements

Trois gestes à la souris : **déplacer** la barre (durée conservée), **redimensionner** le début
(poignée gauche) ou la fin (poignée droite). Pendant le geste, la barre suit le pointeur, un
fantôme reste à l'ancienne place, et la ligne cible est surlignée si la barre change de ligne.
`Échap` annule. Le conteneur défile automatiquement quand le pointeur approche de ses bords.

À la fin du geste, le composant appelle `onTaskChange` avec :

```ts
interface TaskChange {
  id: string;
  start: DateTime;
  end: DateTime;
  previousStart: DateTime;
  previousEnd: DateTime;
  reason: 'move' | 'resize-start' | 'resize-end' | 'keyboard';
  /** Présent uniquement si la tâche a changé de ligne. */
  position?: { parentId: string | null; index: number };
  previousPosition: { parentId: string | null; index: number };
}
```

- **Refuser un changement** : retournez `false` depuis `onTaskChange`. Comme le composant est
  contrôlé, la barre revient simplement à sa place.
- **Aperçu en direct** : `onDragPreview(preview | null)` est appelé à chaque mouvement du pointeur
  (dates, position cible, et `snappedTo: 'edge' | 'grid' | 'none'` pour savoir sur quoi la barre
  s'est calée), puis une dernière fois avec `null` à la fin du geste.
- **Clic simple** : `onTaskClick(task, event)` est appelé quand le pointeur n'a pas bougé de plus
  de 3 pixels. Si la tâche est un parent, l'accordéon est aussi basculé.

### Déplacement vertical

Une barre déposée sur une autre ligne **prend la place de cette ligne**. `position.index` est
l'index final de la tâche parmi ses frères, une fois retirée de son ancienne place :

- Déposer sur une ligne racine : la tâche devient racine à cet index.
- Déposer sur une ligne enfant d'un parent déplié : la tâche devient enfant de ce parent à cet index.
- Une tâche qui a des enfants ne peut pas être imbriquée : déposée sur une ligne enfant, elle prend
  la place du parent de cette ligne.

Désactivable avec `allowVerticalMove={false}`. `allowResize={false}` retire les poignées.

`applyTaskChange(tasks, change)` gère tout cela (dates, réordonnancement, imbrication,
désimbrication) et renvoie un nouveau tableau sans muter l'ancien.

---

## Snap

| Prop              | Défaut   | Description                                                                                             |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `snap`            | `'hour'` | Grille de temps : `'minute'`, `'hour'`, `'day'`, `'none'`, ou un pas en millisecondes (`15 * 60_000`). |
| `snapToTasks`     | `true`   | Aimante le début et la fin de la barre sur les débuts/fins des **autres** tâches.                       |
| `snapThresholdPx` | `8`      | Rayon de l'aimant en pixels. Dans ce rayon, l'aimant gagne sur la grille.                               |
| `minDuration`     | 1 unité  | Durée minimale (ms) lors d'un redimensionnement. Par défaut l'unité de snap, au minimum une minute.    |

En déplacement, c'est l'extrémité (début ou fin) la plus proche d'un bord voisin qui est aimantée ;
la durée est toujours conservée. Les grilles `hour` et `day` sont calculées avec Luxon dans la zone
`zone`, donc les journées de 23 h ou 25 h lors des changements d'heure sont correctes.

---

## Mode brouillon

Avec `draft`, les gestes ne déclenchent plus `onTaskChange`. Les modifications sont accumulées et
**prévisualisées** : barre en pointillés à sa nouvelle place, fantôme à l'ancienne, lignes
réordonnées. Une barre d'outils intégrée propose de valider ou d'annuler l'ensemble.

```tsx
<Gantt
  draft
  tasks={tasks}
  onDraftChange={(changes) => setDirty(changes.length > 0)}
  onDraftCommit={(changes) => setTasks((prev) => applyTaskChanges(prev, changes))}
  labels={{ commit: 'Valider', discard: 'Annuler', pendingChanges: (n) => `${n} modification(s)` }}
/>
```

- `onDraftChange(changes)` : appelé à chaque évolution de la liste en attente.
- `onDraftCommit(changes)` : appelé à la validation avec toutes les modifications, dans l'ordre où
  elles ont été faites. Retourner `false` conserve la liste (par exemple si l'enregistrement
  échoue).
- Plusieurs modifications d'une même tâche sont fusionnées : une seule entrée, dont
  `previousStart`, `previousEnd` et `previousPosition` reflètent l'état d'origine.
- `showDraftToolbar={false}` masque la barre intégrée, `renderDraftToolbar` la remplace, et la
  [ref](#ref-impérative) expose `commitDraft()`, `discardDraft()` et `getPendingChanges()`.
- Passer `draft` à `false` vide la liste en attente.

---

## Échelle de temps, zoom et plage

| Prop           | Défaut                   | Description                                                                                             |
| -------------- | ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `zoom`         | `'day'`                  | Unité de la colonne : `'hour'`, `'day'`, `'week'`, `'month'`. L'en-tête a deux niveaux (mois > jours…). |
| `onZoomChange` | —                        | Si fourni, `Ctrl + molette` zoome et dézoome.                                                          |
| `columnWidth`  | 60 / 40 / 140 / 160      | Largeur en pixels d'une unité de zoom (heure / jour / semaine / mois).                                  |
| `range`        | calculée                 | `{ start, end }` de la plage visible. Par défaut : l'étendue des tâches, plus une unité de chaque côté. |
| `zone`         | `'local'`                | Zone IANA (`'Europe/Paris'`) utilisée pour la grille, les en-têtes et les dates émises.                 |
| `locale`       | locale du navigateur     | Locale Luxon des en-têtes (`'fr'`).                                                                     |
| `showNow`      | `true`                   | Trait vertical à l'instant présent. `now` permet de forcer cet instant.                                 |

Conseil : fournissez `range` quand les tâches bougent souvent, sinon la plage calculée se recale sur
les nouvelles dates et la vue peut sauter.

---

## Clavier et accessibilité

Chaque barre est focusable (`Tab`) et porte un `aria-label` avec le libellé et les dates.

| Touche              | Action                                          |
| ------------------- | ----------------------------------------------- |
| `←` / `→`           | Déplace la tâche d'une unité de snap             |
| `Shift + ←` / `→`   | Redimensionne la fin                            |
| `Alt + ←` / `→`     | Redimensionne le début                          |
| `↑` / `↓`           | Déplace la tâche sur la ligne précédente/suivante |
| `Entrée` / `Espace` | Déplie ou replie une tâche parente              |
| `Échap`             | Annule le drag en cours                         |

Les changements clavier passent par `onTaskChange` avec `reason: 'keyboard'`. `readOnly` désactive
toute interaction (les barres restent visibles mais ne sont plus focusables).

---

## Personnalisation

### Variables CSS

À définir sur `.gantt-root` ou via la prop `style` :

```css
.gantt-root {
  --gantt-row-height: 36px;
  --gantt-bar-color: #3b82f6;      /* couleur par défaut des barres */
  --gantt-bar-text: #fff;
  --gantt-grid-color: #e5e7eb;
  --gantt-grid-major-color: #d1d5db;
  --gantt-bg: #fff;
  --gantt-row-alt-bg: #f9fafb;
  --gantt-row-hover-bg: #eff6ff;
  --gantt-text: #111827;
  --gantt-muted: #6b7280;
  --gantt-pending-color: #f59e0b;  /* contour des barres en brouillon */
  --gantt-drop-color: #2563eb;     /* surlignage de la ligne cible */
  --gantt-font: ui-sans-serif, system-ui, sans-serif;
}
```

### Classes par slot

`classNames` ajoute une classe à chaque zone du composant. Slots disponibles : `root`, `scroller`,
`header`, `headerSidebar`, `headerTimeline`, `headerTierTop`, `headerTierBottom`, `headerCell`,
`grid`, `gridLine`, `gridLineMajor`, `nowLine`, `row`, `rowGroup`, `rowChild`, `rowDropTarget`,
`sidebarCell`, `sidebarLabel`, `toggle`, `timelineCell`, `bar`, `barGroup`, `barChild`,
`barPending`, `barDragging`, `barLabel`, `handle`, `ghost`, `draftToolbar`, `draftButton`,
`draftButtonPrimary`.

```tsx
<Gantt classNames={{ bar: 'shadow-sm', barGroup: 'font-semibold', row: 'transition-colors' }} />
```

`barClassName(task)` et `barStyle(task)` personnalisent une barre en fonction de la tâche.

### Render props

```tsx
<Gantt
  renderBar={({ task, start, end, isGroup, isPending }) => (
    <span className="flex gap-1">
      {isGroup && '▣'} {task.label} <em>{start.toFormat('HH:mm')}–{end.toFormat('HH:mm')}</em>
    </span>
  )}
  renderLabel={({ task, expanded, toggle }) => (
    <button onClick={toggle}>{expanded ? '−' : '+'} {task.label}</button>
  )}
  renderHeaderCell={(tick, tier) => (tier === 'top' ? tick.label.toUpperCase() : tick.label)}
  renderDraftToolbar={({ changes, commit, discard }) => <MyToolbar count={changes.length} onSave={commit} onCancel={discard} />}
/>
```

### Libellés

`labels` traduit les textes intégrés : `commit`, `discard`, `pendingChanges(n)`, `expand`,
`collapse`, `bar(task, start, end)` (aria-label des barres).

### Attributs `data-*`

Utiles pour du CSS ciblé ou des tests :

- `[data-gantt="bar"][data-task-id="…"]`, `[data-kind="leaf|group|child"]`, `[data-dragging]`, `[data-pending]`
- `[data-gantt="row"][data-task-id="…"][data-row-index]`, `[data-kind="leaf|group|child"]`, `[data-drop-target]`
- `[data-gantt="root"][data-dragging="move|resize-start|resize-end"]`
- `[data-gantt="toggle"]`, `[data-gantt="ghost"]`, `[data-gantt="header-cell"]`, `[data-gantt="draft-toolbar"]`

---

## Référence des props

| Prop                  | Type                                            | Défaut          |
| --------------------- | ----------------------------------------------- | --------------- |
| `tasks`               | `GanttTask[]`                                   | requis          |
| `zoom`                | `'hour' \| 'day' \| 'week' \| 'month'`          | `'day'`         |
| `onZoomChange`        | `(zoom) => void`                                | —               |
| `range`               | `{ start, end }`                                | calculée        |
| `zone`                | `string`                                        | `'local'`       |
| `locale`              | `string`                                        | navigateur      |
| `snap`                | `SnapMode`                                      | `'hour'`        |
| `snapToTasks`         | `boolean`                                       | `true`          |
| `snapThresholdPx`     | `number`                                        | `8`             |
| `minDuration`         | `number` (ms)                                   | unité de snap   |
| `parentMode`          | `'independent' \| 'inline'`                     | `'independent'` |
| `expandedIds`         | `string[]`                                      | —               |
| `defaultExpandedIds`  | `string[]`                                      | `[]`            |
| `onExpandedChange`    | `(ids: string[]) => void`                       | —               |
| `readOnly`            | `boolean`                                       | `false`         |
| `allowVerticalMove`   | `boolean`                                       | `true`          |
| `allowResize`         | `boolean`                                       | `true`          |
| `onTaskChange`        | `(change) => void \| boolean`                   | —               |
| `onDragPreview`       | `(preview \| null) => void`                     | —               |
| `onTaskClick`         | `(task, event) => void`                         | —               |
| `draft`               | `boolean`                                       | `false`         |
| `onDraftChange`       | `(changes) => void`                             | —               |
| `onDraftCommit`       | `(changes) => void \| boolean`                  | —               |
| `showDraftToolbar`    | `boolean`                                       | `true`          |
| `renderDraftToolbar`  | `(ctx) => ReactNode`                            | —               |
| `rowHeight`           | `number`                                        | `36`            |
| `columnWidth`         | `number`                                        | selon zoom      |
| `sidebarWidth`        | `number`                                        | `240`           |
| `headerHeight`        | `number`                                        | `48`            |
| `height`              | `number \| string`                              | `500`           |
| `overscan`            | `number`                                        | `5`             |
| `showNow`             | `boolean`                                       | `true`          |
| `now`                 | `DateInput`                                     | `Date.now()`    |
| `renderBar`           | `(ctx) => ReactNode`                            | —               |
| `renderLabel`         | `(ctx) => ReactNode`                            | —               |
| `renderHeaderCell`    | `(tick, tier) => ReactNode`                     | —               |
| `barClassName`        | `(task) => string \| undefined`                 | —               |
| `barStyle`            | `(task) => CSSProperties \| undefined`          | —               |
| `classNames`          | `Partial<Record<GanttSlot, string>>`            | `{}`            |
| `className` / `style` | racine                                          | —               |
| `labels`              | `Partial<GanttLabels>`                          | anglais         |

---

## Ref impérative

```tsx
const ref = useRef<GanttHandle>(null);
<Gantt ref={ref} … />

ref.current?.commitDraft();
ref.current?.discardDraft();
ref.current?.getPendingChanges();   // TaskChange[]
ref.current?.scrollToTask('dev');   // fait défiler jusqu'à la ligne et au début de la barre
ref.current?.scrollToTime('2026-02-01');
ref.current?.getScrollElement();    // l'élément scrollable, pour des intégrations avancées
```

---

## Utilitaires exportés

En plus du composant, le package exporte le moteur pur, pratique pour des tests ou des calculs
côté application :

- `applyTaskChange(tasks, change)`, `applyTaskChanges(tasks, changes)`
- `computeDrag(input)`, `computeKeyboardStep(input)`
- `snapToGrid(ms, snap, zone)`, `snapTime(ms, ctx)`, `nearestEdge(ms, edges, threshold)`, `snapUnitMs(snap)`
- `flattenRows(tasks, expandedIds, parentMode)`, `getDropPosition(rows, rowIndex, task)`, `findTask(tasks, id)`
- `toMs`, `toDateTime`, `computeRange`, `createTimeScale`, `msToPx`, `pxToMs`, `buildHeaderTicks`
- Constantes `MINUTE`, `HOUR`, `DAY`, `WEEK`

---

## Recettes

**Enregistrer côté serveur et annuler en cas d'échec**

```tsx
const handleChange = (change: TaskChange) => {
  const previous = tasks;
  setTasks((prev) => applyTaskChange(prev, change));
  api.updateTask(change.id, { start: change.start.toISO(), end: change.end.toISO() }).catch(() => setTasks(previous));
};
```

**Interdire de sortir une sous-tâche de son parent**

```tsx
onTaskChange={(change) => {
  if (change.position && change.position.parentId !== change.previousPosition.parentId) return false;
  setTasks((prev) => applyTaskChange(prev, change));
}}
```

**Afficher une info-bulle pendant le drag**

```tsx
const [preview, setPreview] = useState<DragPreview | null>(null);
<Gantt onDragPreview={setPreview} … />
{preview && <Tooltip>{preview.start.toFormat('dd/MM HH:mm')} → {preview.end.toFormat('dd/MM HH:mm')}</Tooltip>}
```

**Thème sombre**

```tsx
<Gantt style={{ '--gantt-bg': '#0f172a', '--gantt-row-alt-bg': '#111c33', '--gantt-text': '#e2e8f0', '--gantt-grid-color': '#1e293b' } as CSSProperties} />
```

---

## Développement et tests

```bash
npm install
npm run dev          # démo sur http://localhost:5173 (?dataset=big pour 3000 lignes)
npm run typecheck
npm test             # Vitest : moteur pur + composant (jsdom, Testing Library)
npm run test:e2e     # Playwright : vrais drags souris dans Chromium sur la démo
npm run build        # dist/ : index.js (ESM), index.cjs, index.d.ts, styles.css
```

Organisation des tests :

- `src/core/*.test.ts` : snap, drag, lignes, virtualisation, en-têtes, application des changements.
  Le moteur est en fonctions pures pour être testé exhaustivement (cas limites, DST, seuils).
- `src/components/Gantt.test.tsx` : composant avec pointer events simulés (déplacement,
  redimensionnement, vertical, clavier, brouillon, virtualisation, zoom).
- `e2e/gantt.spec.ts` : scénarios utilisateur dans un vrai navigateur, là où jsdom ne fait pas de
  layout.

La CI GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) exécute l'ensemble à
chaque push.

## Licence

MIT
