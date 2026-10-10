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
- **Mode ressources** (1.1) : une ligne par ressource (machine, opérateur…), plusieurs barres par
  ligne réparties en couloirs, déplacement d'une ressource à l'autre, périodes fermées hachurées,
  sélection, liens de dépendance et refus des cibles de dépôt invalides.
- **Virtualisation** : des milliers de lignes sans ralentissement, hauteurs variables comprises.
- **Composant contrôlé** : il ne modifie jamais vos données, il émet des événements.
- Rendu **HTML** (pas de canvas) : tout est stylable via CSS variables, classes et render props.
- Dates avec [Luxon](https://moment.github.io/luxon/), styles **Tailwind** précompilés (aucune
  configuration Tailwind requise côté application).

> **Statut** : `1.1.0`, dépôt privé. Le package n'est pas publié sur npm (`"private": true`),
> installez-le depuis Git. La 1.1 est strictement additive : sans les nouvelles props, le
> comportement et le rendu sont ceux de la 1.0.

---

## Sommaire

1. [Installation](#installation)
2. [Premier exemple](#premier-exemple)
3. [Modèle de données](#modèle-de-données)
4. [Tâches parentes et sous-tâches](#tâches-parentes-et-sous-tâches)
5. [Déplacements et événements](#déplacements-et-événements)
6. [Snap](#snap)
7. [Mode brouillon](#mode-brouillon)
8. [Mode ressources](#mode-ressources)
9. [Échelle de temps, zoom et plage](#échelle-de-temps-zoom-et-plage)
10. [Clavier et accessibilité](#clavier-et-accessibilité)
11. [Personnalisation](#personnalisation)
12. [Référence des props](#référence-des-props)
13. [Ref impérative](#ref-impérative)
14. [Utilitaires exportés](#utilitaires-exportés)
15. [Recettes](#recettes)
16. [Développement et tests](#développement-et-tests)
17. [Changelog](#changelog)

---

## Installation

```bash
npm install github:1bod/react-gantt#v1.1.0 luxon
bun add github:1bod/react-gantt#v1.1.0 luxon
```

`react` et `react-dom` (`^19.3.0`) sont des peer dependencies.

Depuis la 1.1.0, **les tags de release contiennent `dist/`** (commit de release dédié) : le
package s'installe tel quel, sans étape de build, y compris avec les gestionnaires qui n'exécutent
pas les scripts de cycle de vie des dépendances Git (bun, pnpm). Sur les branches, `dist/` reste
ignoré. Le tag `v1.0.0` ne contient pas `dist/` et repose sur le script `prepare` (npm uniquement).
Dans un monorepo, vous pouvez aussi ajouter le dépôt comme package local, ou pointer un alias Vite
vers `src/index.ts` (c'est ce que fait la démo, voir [demo/vite.config.ts](demo/vite.config.ts)).

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
  /** Mode ressources : id de la ligne (ressource) sur laquelle la tâche est dessinée. */
  rowId?: string;
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
  /** Mode ressources : présent uniquement si la tâche a changé de ressource. */
  rowId?: string;
  /** Mode ressources : la ressource d'origine. */
  previousRowId?: string;
}
```

- **Refuser un changement** : retournez `false` depuis `onTaskChange`. Comme le composant est
  contrôlé, la barre revient simplement à sa place.
- **Aperçu en direct** : `onDragPreview(preview | null)` est appelé à chaque mouvement du pointeur
  (dates, position cible, et `snappedTo: 'edge' | 'grid' | 'none'` pour savoir sur quoi la barre
  s'est calée ; en mode ressources `rowId`, la ligne visée ; avec `canDrop`, `valid`), puis une
  dernière fois avec `null` à la fin du geste.
- **Refuser une cible pendant le geste** : `canDrop(change)` reçoit le changement que produirait
  un dépôt à la position courante. S'il retourne `false`, la barre porte `data-invalid` (contour
  `--gantt-invalid-color`, curseur `not-allowed`) tant qu'elle survole cette cible, et le dépôt y
  est annulé. Les déplacements au clavier sont filtrés de la même façon.
- **Barre collée au pointeur** : avec `dragFollowsPointer`, la barre suit le pointeur au pixel près
  (sans snap, librement en vertical) et un indicateur `[data-gantt="drop-indicator"]` (slot
  `dropIndicator`) montre la cible calée (ligne, couloir, dates). Par défaut (1.0), c'est la barre
  elle-même qui saute à la position calée. Dans les deux cas un fantôme reste à l'ancienne place
  et la barre déplacée n'a jamais de transition.
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

## Mode ressources

Pour un ordonnanceur de production : une ligne par **ressource** (machine, poste, opérateur), et
sur chaque ligne toutes les tâches qui lui sont affectées.

```tsx
import { useState } from 'react';
import { Gantt, applyTaskChange, type GanttResourceRow, type GanttTask, type TaskChange } from '@1bod/react-gantt';

const machines: GanttResourceRow<{ code: string }>[] = [
  { id: 'tour-1', label: 'Tour CNC 1', data: { code: 'TCN-01' } },
  { id: 'fraise', label: 'Fraiseuse 5 axes', data: { code: 'FR5-01' } },
];

const operations: GanttTask[] = [
  { id: 'of1042-10', label: 'OF-1042 · 10 Tournage', start: '2026-10-12T06:00', end: '2026-10-12T09:00', rowId: 'tour-1' },
  { id: 'of1043-10', label: 'OF-1043 · 10 Tournage', start: '2026-10-12T08:00', end: '2026-10-12T11:00', rowId: 'tour-1' },
  { id: 'of1042-20', label: 'OF-1042 · 20 Fraisage', start: '2026-10-12T09:00', end: '2026-10-12T12:00', rowId: 'fraise' },
];

export function Board() {
  const [tasks, setTasks] = useState(operations);
  return (
    <Gantt
      rows={machines}
      tasks={tasks}
      rowHeight={28}
      laneHeight={24}
      barInset={4}
      onTaskChange={(change: TaskChange) => setTasks((prev) => applyTaskChange(prev, change))}
      renderRowLabel={({ row, tasks }) => `${row.label} (${tasks.length})`}
    />
  );
}
```

- **Lignes** : `rows` active le mode. Chaque tâche (racine ou enfant) dont `rowId` correspond à une
  ligne y est dessinée ; les autres ne sont pas affichées. Il n'y a ni accordéon ni `parentMode`
  dans ce mode.
- **Couloirs** : les barres qui se chevauchent sur une même ligne sont réparties en couloirs
  (algorithme glouton, ordre stable par début puis id ; deux barres qui se touchent partagent un
  couloir). Chaque couloir supplémentaire ajoute `laneHeight` (par défaut `rowHeight`) à la ligne.
  `barInset` fixe l'écart en pixels entre une barre et les bords de son couloir (par défaut 15 % de
  `rowHeight`) : avec 28 / 24 / 4, une barre fait 20 px et une ligne à deux couloirs 52 px.
- **Libellés** : `renderRowLabel({ row, index, tasks, laneCount, hasSelection })` remplace
  `row.label` dans la colonne de gauche. `renderSidebarHeader()` remplit la cellule au-dessus.
- **Déplacement** : glisser une barre sur une autre ligne émet un `TaskChange` avec `rowId` (la
  nouvelle ressource) et `previousRowId` ; `position` n'est pas utilisée. `applyTaskChange` met à
  jour `rowId`. `↑` / `↓` changent de ressource au clavier. En mode brouillon, le fantôme reste sur
  la ressource d'origine.
- **Render props** : `renderBar` reçoit en plus `resource` (la ligne) et `lane`.
- **Virtualisation** : elle fonctionne avec les hauteurs variables (décalages cumulés + recherche
  dichotomique) ; la ligne de la barre déplacée reste montée même si elle sort de la fenêtre.

### Périodes fermées

```tsx
const closedRanges = (row: GanttResourceRow | GanttRow) =>
  'task' in row ? [] : calendars[row.id]; // [{ start, end }, …] en DateInput

<Gantt rows={machines} closedRanges={closedRanges} closedNarrowThreshold={30} … />
```

Chaque période est dessinée sur toute la hauteur de la ligne, derrière les barres
(`[data-gantt="closed"]`, slot `closedRange`), avec `--gantt-closed-bg` et une hachure à 45°
`--gantt-closed-hatch` (une hachure `transparent` donne un aplat). Les blocs plus étroits que
`closedNarrowThreshold` pixels portent `data-narrow` et n'ont pas de hachure par défaut. Seule la
partie visible est rendue. En mode tâches, la fonction reçoit la ligne de tâche (`'task' in row`).
Le résultat est mis en cache par ligne jusqu'à ce que la fonction ou les lignes changent :
passez une fonction stable.

### Sélection et mise en évidence

`selectedIds` + `onSelectionChange` (ou `onSelectionChange` seul, état interne) :

- clic : sélectionne une barre ; `Shift`, `Cmd` ou `Ctrl` + clic : l'ajoute ou la retire ;
- `Entrée` / `Espace` sur une barre (hors parent en mode tâches) : idem au clavier ;
- `Échap` (focus dans le Gantt ou nulle part) et clic dans une zone vide de la grille : vide la
  sélection.

Les barres sélectionnées portent `data-selected` (slot `barSelected`, contour
`--gantt-selected-color`, au-dessus des autres), les lignes qui en contiennent une
`data-has-selection`. `highlightedIds` met d'autres barres en évidence (`data-highlighted`, slot
`barHighlighted`, `--gantt-highlight-color`), par exemple les autres opérations de l'ordre
sélectionné. `BarRenderContext` expose `isSelected` et `isHighlighted`. Aucune animation.

### Liens

```tsx
<Gantt links={[{ id: 'l1', from: 'of1042-10', to: 'of1042-20', type: 'finish_start' }]} showLinks="selected" … />
```

Les liens (`finish_start` par défaut, `start_start`, `finish_finish`) sont dessinés en coudes
orthogonaux dans un calque SVG au-dessus des lignes et sous les barres
(`[data-gantt="link"][data-link-id][data-type]`, slot `link`, couleur `--gantt-link-color`).
`showLinks` : `'selected'` (défaut, liens touchant une barre sélectionnée), `'all'` ou `'none'`.
Un lien dont une des barres n'est pas rendue (virtualisée, hors fenêtre) n'est pas dessiné ; un
lien suit la barre pendant un déplacement.

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
| `renderNow`    | —                        | Contenu dessiné dans la bande basse de l'en-tête, centré sur le trait (une pastille « 14:32 »).         |
| `headerTiers`  | `DEFAULT_HEADER_TIERS`   | Bandes de l'en-tête par niveau de zoom (voir ci-dessous).                                               |
| `showTicks`    | `false`                  | Graduations sur la bande basse ; ses libellés sont alors alignés à gauche sur leur graduation.          |

Conseil : fournissez `range` quand les tâches bougent souvent, sinon la plage calculée se recale sur
les nouvelles dates et la vue peut sauter.

### Bandes de l'en-tête

Chaque niveau de zoom a deux bandes, haute et basse. `headerTiers` remplace celles d'un ou plusieurs
niveaux ; une bande donne une unité (`year`, `quarter`, `month`, `week`, `day`, `hour`,
`minute`), un pas (`step`, aligné sur l'unité parente et insensible aux changements d'heure) et un
format (chaîne Luxon ou fonction de la date de début de la cellule) :

```tsx
const headerTiers = {
  hour: [{ unit: 'day', format: 'ccc d LLL' }, { unit: 'hour', format: 'HH:mm' }],
  day: [{ unit: 'day', format: 'ccc d LLL' }, { unit: 'hour', step: 6, format: 'HH:mm' }], // 00:00 06:00 12:00 18:00
  week: [{ unit: 'week', format: "'S'W" }, { unit: 'day', format: 'd' }],
} satisfies GanttProps['headerTiers'];

<Gantt zoom="day" columnWidth={480} headerTiers={headerTiers} showTicks … />
```

Les valeurs par défaut (`DEFAULT_HEADER_TIERS`) reproduisent exactement la 1.0. Les lignes
verticales de la grille suivent la bande basse ; celles qui tombent sur une limite de la bande
haute sont « majeures » (`data-major`, `--gantt-grid-major-color`, slot `gridLineMajor`). Passez
un objet stable (constante ou `useMemo`). Les cellules portent `data-tier="top|bottom"`.

---

## Clavier et accessibilité

Chaque barre est focusable (`Tab`) et porte un `aria-label` avec le libellé et les dates.

| Touche              | Action                                          |
| ------------------- | ----------------------------------------------- |
| `←` / `→`           | Déplace la tâche d'une unité de snap             |
| `Shift + ←` / `→`   | Redimensionne la fin                            |
| `Alt + ←` / `→`     | Redimensionne le début                          |
| `↑` / `↓`           | Déplace la tâche sur la ligne précédente/suivante (la ressource, en mode ressources) |
| `Entrée` / `Espace` | Déplie ou replie une tâche parente ; sinon, avec la sélection activée, sélectionne la barre (`Shift` : ajoute / retire) |
| `Échap`             | Annule le drag en cours ; sinon vide la sélection |

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
  --gantt-drop-color: #2563eb;     /* surlignage de la ligne cible, indicateur de dépôt */
  --gantt-font: ui-sans-serif, system-ui, sans-serif;

  /* 1.1 : plus aucune couleur codée en dur, chaque défaut reproduit la 1.0 */
  --gantt-now-color: oklch(63.7% 0.237 25.331); /* trait de l'instant présent (red-500) */
  --gantt-focus-color: oklch(62.3% 0.214 259.815); /* contour de focus des barres (blue-500) */
  --gantt-drop-text: #fff;                      /* texte du bouton « Valider » */
  --gantt-handle-hover-bg: rgb(0 0 0 / 0.2);    /* poignées de redimensionnement au survol */
  --gantt-toggle-hover-bg: rgb(0 0 0 / 0.1);    /* chevron d'accordéon au survol */
  --gantt-button-hover-bg: rgb(0 0 0 / 0.05);   /* bouton « Annuler » au survol */
  --gantt-ghost-hatch: rgb(0 0 0 / 0.08);       /* hachures du fantôme */
  --gantt-drag-shadow: 0 4px 12px rgb(0 0 0 / 0.25);
  --gantt-toolbar-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --gantt-closed-bg: #f3f4f6;                   /* périodes fermées */
  --gantt-closed-hatch: #e5e7eb;                /* hachure à 45° (transparent = aplat) */
  --gantt-tick-height: 6px;                     /* graduations de l'en-tête */
  --gantt-selected-color: #2563eb;              /* contour des barres sélectionnées */
  --gantt-highlight-color: #93c5fd;             /* contour des barres mises en évidence */
  --gantt-link-color: var(--gantt-muted);       /* liens */
  --gantt-invalid-color: #dc2626;               /* cible refusée par canDrop */
  --gantt-lane-height: …;                       /* posée par le composant en mode ressources */
}
```

Les règles par défaut ajoutées en 1.1 (périodes fermées, sélection, mise en évidence, cible
invalide, indicateur de dépôt, liens, ombre de la barre d'outils) sont dans la couche CSS
`components` : une classe utilitaire passée par `classNames` les surcharge. Les règles 1.0 sont
inchangées.

### Classes par slot

`classNames` ajoute une classe à chaque zone du composant. Slots disponibles : `root`, `scroller`,
`header`, `headerSidebar`, `headerTimeline`, `headerTierTop`, `headerTierBottom`, `headerCell`,
`headerTick`, `grid`, `gridLine`, `gridLineMajor`, `nowLine`, `nowMarker`, `row`, `rowGroup`,
`rowChild`, `rowDropTarget`, `sidebarCell`, `sidebarLabel`, `toggle`, `timelineCell`,
`closedRange`, `bar`, `barGroup`, `barChild`, `barPending`, `barDragging`, `barSelected`,
`barHighlighted`, `barInvalid`, `barLabel`, `handle`, `ghost`, `dropIndicator`, `link`,
`draftToolbar`, `draftButton`, `draftButtonPrimary`.

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

- `[data-gantt="bar"][data-task-id="…"]`, `[data-kind="leaf|group|child"]`, `[data-dragging]`, `[data-pending]`,
  `[data-selected]`, `[data-highlighted]`, `[data-invalid]`
- `[data-gantt="row"][data-task-id="…"][data-row-index]`, `[data-kind="leaf|group|child"]`, `[data-drop-target]`,
  `[data-has-selection]` ; en mode ressources `[data-row-id="…"][data-kind="resource"][data-lanes]`
- `[data-gantt="root"][data-dragging="move|resize-start|resize-end"]`
- `[data-gantt="toggle"]`, `[data-gantt="ghost"]`, `[data-gantt="header-cell"][data-tier="top|bottom"]`,
  `[data-gantt="header-tick"]`, `[data-gantt="grid-line"][data-major]`, `[data-gantt="now"]`,
  `[data-gantt="now-marker"]`, `[data-gantt="closed"][data-narrow]`, `[data-gantt="drop-indicator"][data-invalid]`,
  `[data-gantt="links"]`, `[data-gantt="link"][data-link-id][data-type]`, `[data-gantt="draft-toolbar"]`

### Animations

Le composant n'anime rien (pas de transition, pas d'animation, défilement instantané) : il n'y a
donc rien à adapter pour `prefers-reduced-motion`. La barre en cours de déplacement force
`transition: none`, même si l'application ajoute des transitions aux barres. Si vous en ajoutez
(par exemple un « settle » au dépôt), prévoyez leur variante `prefers-reduced-motion`.

---

## Référence des props

Les props ajoutées en 1.1 sont marquées ¹.

| Prop                  | Type                                            | Défaut          |
| --------------------- | ----------------------------------------------- | --------------- |
| `tasks`               | `GanttTask[]`                                   | requis          |
| `rows` ¹              | `GanttResourceRow[]` : active le mode ressources | —              |
| `laneHeight` ¹        | `number` : hauteur ajoutée par couloir           | `rowHeight`    |
| `barInset` ¹          | `number` : écart barre / bords du couloir (px)   | 15 % de `rowHeight` |
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
| `canDrop` ¹           | `(change) => boolean` : refuse une cible         | —               |
| `dragFollowsPointer` ¹ | `boolean` : barre au pointeur + indicateur      | `false`         |
| `selectedIds` ¹       | `string[]` (contrôlé)                           | —               |
| `onSelectionChange` ¹ | `(ids: string[]) => void`                       | —               |
| `highlightedIds` ¹    | `string[]`                                      | —               |
| `links` ¹             | `GanttLink[]`                                   | —               |
| `showLinks` ¹         | `'selected' \| 'all' \| 'none'`                  | `'selected'`    |
| `closedRanges` ¹      | `(row) => ClosedRange[]`                        | —               |
| `closedNarrowThreshold` ¹ | `number` (px)                               | `30`            |
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
| `renderNow` ¹         | `(now: DateTime) => ReactNode`                  | —               |
| `headerTiers` ¹       | `Partial<Record<ZoomLevel, HeaderTierSpecs>>`   | `DEFAULT_HEADER_TIERS` |
| `showTicks` ¹         | `boolean`                                       | `false`         |
| `renderSidebarHeader` ¹ | `() => ReactNode`                             | —               |
| `renderBar`           | `(ctx) => ReactNode`                            | —               |
| `renderLabel`         | `(ctx) => ReactNode`                            | —               |
| `renderRowLabel` ¹    | `(ctx: RowLabelRenderContext) => ReactNode`     | `row.label`     |
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
- `toMs`, `toDateTime`, `computeRange`, `createTimeScale`, `msToPx`, `pxToMs`,
  `buildHeaderTicks(range, zoom, zone, locale, tiers?)`, `DEFAULT_HEADER_TIERS`
- 1.1 : `packLanes(items)` (couloirs), `buildResourceLayout(rows, tasks, rowHeight, laneHeight)`,
  `toIntervals(ranges)`, `clipRanges(intervals, startMs, endMs)`, `linkPath(from, to, type)`,
  `selectLinks(links, mode, selected)`, `nextSelection(ids, action)`
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
npm run dev          # démo sur http://localhost:5173 (?dataset=big pour 3000 lignes, ?dataset=resources pour l'atelier)
npm run typecheck
npm test             # Vitest : moteur pur + composant (jsdom, Testing Library)
npm run test:e2e     # Playwright : vrais drags souris dans Chromium sur la démo
npm run build        # dist/ : index.js (ESM), index.cjs, index.d.ts, styles.css
```

Organisation des tests :

- `src/core/*.test.ts` : snap, drag, lignes, virtualisation, en-têtes, application des changements,
  couloirs, mode ressources, périodes fermées, liens, sélection. Le moteur est en fonctions pures
  pour être testé exhaustivement (cas limites, DST, seuils).
- `src/components/Gantt.test.tsx` : composant avec pointer events simulés (déplacement,
  redimensionnement, vertical, clavier, brouillon, virtualisation, zoom).
- `src/components/GanttResources.test.tsx` et `GanttBoard.test.tsx` : mode ressources, périodes
  fermées, en-tête, sélection, liens, `canDrop`, `dragFollowsPointer`, thème.
- `e2e/gantt.spec.ts` et `e2e/resources.spec.ts` : scénarios utilisateur dans un vrai navigateur,
  là où jsdom ne fait pas de layout.

### Publier une version

Les tags de release contiennent `dist/` pour que l'installation depuis Git fonctionne sans build
(bun et pnpm n'exécutent pas `prepare` pour une dépendance Git) :

```bash
npm version 1.x.y --no-git-tag-version && npm run build
git add -f dist package.json package-lock.json && git commit -m "chore(release): 1.x.y"
git tag -a v1.x.y -m "1.x.y" && git rm -r -q --cached dist && git commit -m "chore: untrack dist after the 1.x.y release"
git push origin <branche> v1.x.y
```

La CI GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) exécute l'ensemble à
chaque push.

## Changelog

### 1.1.0

Strictement additive : sans les nouvelles props, rendu et comportement identiques à la 1.0.

- **Mode ressources** : `rows`, `task.rowId`, couloirs (`laneHeight`, `barInset`),
  `renderRowLabel`, `TaskChange.rowId` / `previousRowId`, `DragPreview.rowId`,
  `applyTaskChange` gère `rowId`, virtualisation à hauteurs variables.
- **Périodes fermées** : `closedRanges`, `closedNarrowThreshold`, `--gantt-closed-bg`,
  `--gantt-closed-hatch`, slot `closedRange`.
- **En-tête** : `renderSidebarHeader`, `headerTiers` (unité, pas, format), `showTicks`
  (`--gantt-tick-height`, slot `headerTick`), `renderNow` (slot `nowMarker`), `data-tier` sur
  les cellules, `data-major` sur les lignes de grille.
- **Sélection** : `selectedIds`, `onSelectionChange`, `highlightedIds`, `data-selected` /
  `data-highlighted`, `isSelected` / `isHighlighted` dans `BarRenderContext`.
- **Liens** : `links`, `showLinks`, slot `link`, `--gantt-link-color`.
- **Glisser-déposer** : `canDrop` (`data-invalid`, `DragPreview.valid`), `dragFollowsPointer`
  (indicateur de dépôt, slot `dropIndicator`) ; la ligne de la barre déplacée reste montée quand
  elle sort de la fenêtre virtualisée (le geste n'est plus interrompu).
- **Thème** : plus aucune couleur codée en dur (`--gantt-now-color`, `--gantt-focus-color`, …).
- **CSS** : ordre des couches aligné sur Tailwind (`theme, base, components, utilities`).
- **Distribution** : les tags de release contiennent `dist/` (installation avec bun).

### 1.0.0

Première version : sous-tâches en accordéon, déplacement et redimensionnement avec snap et
aimant, déplacement vertical, mode brouillon, virtualisation, clavier.

## Licence

MIT
