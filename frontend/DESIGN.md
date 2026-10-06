# Selfstack design system

## Principles

1. **Every number has a trend.** No naked scores: show a delta or a sparkline next to it.
2. **One primary action per screen.**
3. **Colour means life area.** Accent violet is for interaction only; status uses success / warning / destructive.
4. **Reversible = undo, destructive = confirm.** Habit log, milestone check and dismiss get an Undo toast; deletes get a `ConfirmDialog`.
5. **Empty is a feature.** Every empty state explains what the thing is and offers the next step (`EmptyState`).

## How colour works

All colours are HSL triplets in `styles/tokens.css`, mapped in `tailwind.config.ts` as `hsl(var(--x) / <alpha-value>)`, so opacity modifiers work (`bg-success/10`). Components use **semantic classes only**: no hex, no `hsl(...)`, no `bg-[hsl(var(--x))]`.

Where a component needs a colour *string* (a Recharts prop, an SVG attribute, `color-mix`), use `tokenColor("name")` from `lib/utils/color.ts` or `chartColors` from `components/charts/chart-theme.ts`. Those are the only places that spell out `hsl(`.

### Fill vs text

A fill that looks right as a dot or bar is often too light to read as text on a light surface. Every area and status colour therefore has a **`-fg`** variant that meets WCAG AA (4.5:1) on the surface, on `bg-elevated` and on its own `/10` tint (checked with axe in both themes):

| Use | Class |
|---|---|
| Dot, bar, border, tint (`/10`) | `bg-area-work`, `border-area-work`, `bg-success/10` |
| Text | `text-area-work-fg`, `text-success-fg`, `text-destructive-fg`, `text-accent-fg` |

In dark mode every fill already passes on the dark base, so `-fg` equals the fill. `lib/areas.ts` exposes ready-made `dot`, `text`, `border` and `soft` class strings per area.

### Token table

| Token | Light | Dark | Tailwind | Notes |
|---|---|---|---|---|
| `--bg-base` | `#FFFFFF` | `#080C16` | `bg-background` | page |
| `--bg-surface` | `#F7F7F7` | `#0F1524` | `bg-surface` | cards |
| `--bg-elevated` | `#F0F0F0` | `#171F30` | `bg-elevated` | nested tiles, tooltips, toasts |
| `--fg-primary` | `#0F1729` | `#F1F5F9` | `text-foreground` | |
| `--fg-secondary` | `#5A687C` (4.97 on elevated) | `#94A3B8` | `text-fg-secondary` | |
| `--fg-muted` | `#5E6D83` (4.62 on elevated) | `#7A8A9E` (4.67 on elevated) | `text-fg-muted` | |
| `--border` / `--border-strong` | | | `border-border` / `border-border-strong` | hairlines / hover |
| `--accent` | `#7C64F2` | `#8F74FB` | `ring-accent`, `bg-accent/10` | rings, focus, tints |
| `--accent-fg` | `#5F42F0` | = accent | `text-accent-fg` | accent as text |
| `--accent-solid` | `#6D4FE8` | `#6D4FE8` | `bg-accent-solid` | filled buttons; white text = 5.34:1 |
| `--destructive-solid` | `#C62020` | `#C62020` | `bg-destructive-solid` | filled destructive button; white text 6:1 |
| `--success` / `-fg` | `#21C45D` / `#147739` | `#30D96E` / = fill | `bg-success`, `text-success-fg` | |
| `--warning` / `-fg` | `#F59F0A` / `#905E06` | `#F6A823` / = fill | `bg-warning`, `text-warning-fg` | |
| `--destructive` / `-fg` | `#EF4343` / `#C81111` | `#EF4D4D` / = fill | `bg-destructive`, `text-destructive-fg` | errors, deletes |

### Life areas

| Area | Fill | `-fg` (light) |
|---|---|---|
| Health | `#EF4343` | `#C81111` |
| Mind | `#F59F0A` | `#905E06` |
| Relationships | `#EC4699` | `#C0146A` |
| Work | `#21C45D` | `#147739` |
| Money | `#21CAB9` | `#13746B` |
| Growth | `#3EBAF4` | `#096F9F` |

Area colours mean *that area*. Do not borrow Health red for an error or Work green for success; use `destructive` / `success`.

### Chart tokens

`--chart-grid` (border, drawn at 60%), `--chart-axis` (fg-muted), `--chart-tooltip-bg` (elevated), `--chart-score` (accent), `--chart-mood` (pink, the Relationships fill), `--chart-energy` (amber, the Mind fill). Charts take their axis, grid and tooltip styling from `components/charts/chart-theme.ts` and render tooltips with `ChartTooltip`.

## Type

Inter via `font-sans`. Scale: 12 label, 14 body, 16 card title, 24 page title, 36 to 48 hero number. Numbers in tiles and charts use `tabular-nums`.

## Surfaces

Cards are `bg-surface` with a hairline `border`; nested tiles are `bg-elevated`. Light mode uses `shadow-sm`; dark mode uses no shadows. Base radius is 10px.

## Primitives

| Component | File | Notes |
|---|---|---|
| `Toaster`, `toastSuccess`, `toastError(err)`, `toastUndo(label, onUndo)` | `components/ui/toaster.tsx`, `lib/toast.ts` | `toastError` reads FastAPI `detail`, validation lists, network / 429 / 5xx cases |
| `ConfirmDialog` | `components/ui/confirm-dialog.tsx` | Radix AlertDialog; `destructive`, optional `typeToConfirm` |
| `EmptyState` | `components/ui/empty-state.tsx` | icon, title, one sentence, action, optional ghost `preview` |
| `StatTile`, `Delta` | `components/ui/stat-tile.tsx`, `delta.tsx` | delta colour + arrow + screen-reader text ("up 0.6"); `invertDelta` when lower is better |
| `Sparkline` | `components/charts/sparkline.tsx` | 32px, no axes, nulls are gaps |
| `RangeTabs` | `components/ui/range-tabs.tsx` | 7D / 30D / 90D / 1Y radiogroup, arrow keys |
| `ChartCard` | `components/ui/chart-card.tsx` | title, value, delta, range tabs, skeleton and empty state at the chart's height |
| `AREAS` | `lib/areas.ts` | single source of truth for the six areas |
