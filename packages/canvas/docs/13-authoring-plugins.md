> 🌐 日本語版: [13-authoring-plugins.ja.md](./13-authoring-plugins.ja.md)

# Authoring Plugins

The practical side of [Plugin Architecture](./12-plugin-architecture.md): how a
shape package is laid out, what the authoring kit gives you, where a piece of code
belongs, and the wiring you must not forget.

Every package under `plugins/` is a worked example. `sticky-shape` is the
smallest complete one; `container-shapes` shows a type-specific selection control;
`uml-shapes` shows multiple text slots; `table-shape` shows part kinds of its own,
selection controls that take clicks, contributed commands, and a box measured
from the content rather than stored.

## Package layout

```
plugins/sticky-shape/
├── package.json
├── playwright.config.ts  the e2e suite's Playwright config
├── e2e/
│   ├── harness/          the page the specs drive — this plugin alone
│   └── specs/            the Playwright specs
└── src/
    ├── index.ts          public exports (plugin, stencil category, anything a host needs)
    ├── plugin.ts         the CanvasPlugin declaration
    ├── doc.ts            the CanvasDocPlugin declaration — headless entry
    ├── definition.ts     the ObjectTypeDefinition (UI half)
    ├── schema/           Doc type, defaults, features, doc validator
    ├── state/            State type, mapper, state validator
    ├── presentation/     the React component and its <defs>
    ├── stencil/          palette icon and stencil entries
    ├── menu/             custom ObjectMenu items, if any
    ├── propertyPanel/    custom properties-sidebar rows, if any
    └── __tests__/        the parse-check suite
```

The two entry points are declared in `package.json`:

```json
{
	"exports": {
		".": "./src/index.ts",
		"./doc": "./src/doc.ts"
	}
}
```

Dependencies follow the same pattern in every plugin: `@jiscribe/canvas` and
`@jiscribe/canvas-sdk` (plus `react` and `@emotion/*`) are declared as
**`peerDependencies` and `devDependencies` both** — peer so a consumer supplies one
copy, dev so the package builds and tests on its own. Anything a plugin genuinely
bundles (`@jiscribe/geometry`, `@jiscribe/basic-validators`) goes in `dependencies`.
The e2e suite adds `@playwright/test` and `vite` to `devDependencies`.

The headless half is written first, because the UI half takes it as input:

```ts
// src/doc.ts
import { createFrameObjectDoc } from "@jiscribe/canvas-sdk/doc";
import type { CanvasDocPlugin, ObjectDocDefinition } from "@jiscribe/doc";
import { calcFullBoxTextRegion } from "@jiscribe/doc";

import { STICKY_DOC_DEFAULTS, StickyFeatures } from "./schema/StickyDoc";

export const stickyDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: StickyFeatures,
	defaults: STICKY_DOC_DEFAULTS,
	textRegion: calcFullBoxTextRegion,
	description: "Sticky note annotation.",
	summary: "sticky note (no stroke or `rx`)",
	supportsBounds: false, // click-placed only, no bounds drawing
});

export const stickyDocPlugin: CanvasDocPlugin = {
	id: "sticky-shape",
	objects: { sticky: stickyDocDefinition },
};
```

```ts
// src/definition.ts
import type { ObjectTypeDefinition } from "@jiscribe/canvas";
import { createFrameObjectDefinition } from "@jiscribe/canvas-sdk";
// plus this package's own parts from ./doc, ./presentation, ./stencil …

export const stickyDefinition: ObjectTypeDefinition<StickyDoc, StickyState> =
	createFrameObjectDefinition<StickyDoc, StickyState>({
		doc: stickyDocDefinition,
		component: Sticky,
		svgDefs: StickyDefs,
		stencils: StickyStencils,
		menu: [/* … */],
	});
```

```ts
// src/plugin.ts
import type { CanvasPlugin } from "@jiscribe/canvas";

import { stickyDefinition } from "./definition";

export const stickyPlugin: CanvasPlugin = {
	id: "sticky-shape",
	objects: { sticky: stickyDefinition },
};
```

## Where a piece of code belongs

Three layers, with a test for each.

| Layer                        | Holds                                                                                       | The test                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `packages/canvas`            | `createFrame*` family, the `ObjectTypeDefinition` contract, registries                      | **Touches engine internals** — the state model, registries, theme, internal validator vocabulary. Add conservatively |
| `packages/canvas-sdk`        | Authoring helpers, plugin-only parts, re-exports of canvas `unstable`                       | **Writable with the canvas public API alone.** Promote once the same shape appears in two plugins                    |
| a plugin's `<layer>/shared/` | Family-specific bases (pictogram in `general-shapes`, group markers in `annotation-shapes`) | **Vocabulary of that shape family only.** Move to the SDK once another family starts using it                        |

Two things pull a helper back into `packages/canvas` even when it looks like SDK
material: dependence on a non-public context (the theme context) or on internal
validator vocabulary. Those stay in canvas and the SDK re-exports them, because
physically moving them would widen the canvas public surface instead of narrowing it.

## What the authoring kit gives you

`@jiscribe/canvas-sdk` re-exports the whole of `@jiscribe/canvas/unstable`
(and `/doc` re-exports `@jiscribe/doc/unstable`), so it is a superset — you never
need to reach past it. On top of that it adds, among others, the following (the
exports of `index.ts` / `doc.ts` / `testing.ts` under `packages/canvas-sdk/src/` are
the full list):

| Export                                                                                                                  | Replaces                                                                   |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `createFrameObjectDoc` (`/doc`)                                                                                         | the per-shape factory and doc-validator files                              |
| `createFrameObjectDefinition`                                                                                           | the per-shape mapper and state-validator files                             |
| `createTypeStencils` / `createStencilIcon`                                                                              | the stencil array and the `<svg>` wrapper every palette icon repeats       |
| `createInsetTextRegion`                                                                                                 | a hand-written `calc*TextRegion` when the region is a fixed ratio inset    |
| `ShapeBodyPath` / `ShapeBodyPolygon`                                                                                    | the styled silhouette every frame shape draws (stroked, filled, grabbable) |
| `calcRoundedRectOutline` / `centeredPolygonOutline` / `formatPolygonPoints`                                             | hand-rolled outline maths                                                  |
| `calcBelowLabelTextRegion` / `calcBelowLabelVisualBounds` / `BelowLabelHitArea` / `BELOW_LABEL_STYLE_DEFAULTS` (`/doc`) | the "drawing fills the box, so the caption hangs underneath" trio          |
| `createParseCheckSuite` (`/testing`)                                                                                    | the parse-check test every shape package writes                            |

The below-label parts go together: pass the region as `createFrameObjectDefinition`'s
`textRegion` (which builds the text slot part kind placing the label) and the bounds
as its `visualBounds` — without the latter, zoom-to-fit and the
export viewBox crop the label away — and place the hit area inside the shape's own
`data-kind="object"` group so the label can be grabbed.

A type whose slots are laid out against each other (a table's cells, a record's
compartments) declares the `"textSlot"` part kind itself, with
`createTextSlotPartKindDefinition({ regions })` in `partKinds`: one call answering
every slot's region, which the renderer makes once per render. A kind takes
`region` or `regions`, not both (see
[Plugin Architecture](./12-plugin-architecture.md)).

Content laid out that way is invisible to `diagnoseDoc`, which measures with the
shared typesetting. To have it reported when the box is too small, declare
`diagnoseOverflow` (`ObjectDocOverflowDiagnoser`) on the doc definition: a
function of the doc returning one English line per overflow — what is short, by
how many pixels, and how to fix it — which `diagnoseDoc` turns into an error on
the object. The record does this for its compartments.

A shape that hand-draws instead of going through `createFrameObject` has to redo
what that helper resolved (the sticky is the example). Colors above all: resolve
them with `resolveAutoColor(fill, "surface")` and **apply the result through CSS,
not the SVG `fill` attribute** — `"auto"` resolves to a `var(--jiscribe-*)` token
that presentation attributes do not evaluate, so an attribute leaves the shape
painted black (#38 / #206).

A type's properties-sidebar sections are declared as `propertyPanel`, and a row of its own is a `{ type: "custom"; id; component }` item built from the sidebar widgets the kit re-exports (`PropertyRow` and friends). A section that has nothing to say for a given selection carries `isShown`, which takes its heading away with its rows — see doc 12 for both.

`./testing` is a separate entry so vitest never reaches a runtime bundle.

## Offering AI tools for your shapes

The generic tools (`set_text`, `set_extra_props`, …) cannot express an edit that
only makes sense for one type — inserting a table row, say. A plugin offers those
as tools of its own: each acts on the one object the call names by `id` and either
rebuilds it (`apply`) or reads it (`read`). Write them against
`@jiscribe/canvas-sdk/tools`, export them from a headless `./tools` entry
(`src/tools.ts`). Write the argument schemas as a zod raw shape (the properties,
not a `z.object`); the host puts it into its declarations as it is, the MCP SDK
declaring tools from zod alone. zod is a peer of the contract, so the plugin and
the host share one copy: add `zod` at the catalog version (`catalog:`) to the
plugin's `peerDependencies` and `devDependencies`.

The contract itself lives in `@jiscribe/ai-tools-sdk`, which
`@jiscribe/canvas-sdk/tools` re-exports. A plugin does not import the former
directly (ESLint rejects it), but canvas-sdk takes it as a peer, so a plugin with a
`./tools` entry adds `@jiscribe/ai-tools-sdk` to its `peerDependencies` and
`devDependencies`.

```ts
// src/tools.ts
import {
	type AiToolPlugin,
	defineObjectAiTool,
} from "@jiscribe/canvas-sdk/tools";
import { z } from "zod";

export const tableAiToolPlugin: AiToolPlugin = {
	id: "table-shape",
	tools: [
		defineObjectAiTool({
			name: "table_insert_tracks", // <type>_<verb>, unique across every tool
			description: "Insert rows or columns into a table.",
			objectType: "table",
			inputSchema: { axis: z.enum(["row", "column"]), at: z.number().int() },
			apply: (table: TableDoc, { axis, at }) => ({
				doc: insertTracks(table, axis, at), // a new object; never mutate `table`
				text: `inserted a ${axis} at ${at}`,
			}),
		}),
	],
};
```

The host adds `id` to the schema, refuses an object of another type, and checks
what `apply` returns against the type's `validateDoc` and the names it holds before
anything is written, so a result the parser would refuse or drop fails the call
and leaves the document alone. Throw an `Error` to refuse a call; its message is
what the AI reads. A `read` tool never writes the document back. A tool name that
repeats a built-in tool or another plugin's tool throws when the host builds its
tool set.

A tool that styles text slots of its own spreads `textSlotStyleSchema` into its
`inputSchema` rather than writing the typography out again: it is the vocabulary
the built-in `set_style` declares, descriptions included. Its `fontWeight` accepts
`"400"` / `"700"`, so pass the value through `canonicalizeFontWeight` before
writing it (the document keeps `"normal"` / `"bold"`). Both come from
`@jiscribe/canvas-sdk/tools`; the table's `table_set_cell_style` is the example.

A tool that decorates part of a text of its own does the same with what the
built-in `set_text_style` declares: `textMatchSchema` (`match` / `occurrence`,
the stretch named by its characters) and `inlineTextStyleSchema` (the typography
a run carries on its own). `styleRichTextMatches` from `@jiscribe/doc` finds and
styles the stretch, the same function behind `set_text_style`, and reports what
it could not find for the tool to word. The table's `table_set_text_style` is
the example.

## Giving the package an e2e suite

Every plugin owns a Playwright suite driving **a harness that holds that plugin alone**.
Passing under a solo load is the evidence that the package leans on no other plugin. How
the shipped set behaves together is not this suite's business — the suite in
`apps/canvas-examples/e2e/` owns that. The machinery is canvas's e2e kit ([Testing](./09-testing.md)), reached
through `@jiscribe/canvas-sdk/testing/*`; `plugins/annotation-shapes/` is the worked example
for everything below.

Two scripts and two dependencies in `package.json`:

```json
{
	"scripts": {
		"dev:harness": "vite e2e/harness --configLoader runner",
		"test:e2e": "playwright test"
	},
	"devDependencies": {
		"@playwright/test": "<same version as packages/canvas>",
		"vite": "catalog:"
	}
}
```

`@playwright/test` is not in the catalog, so match the version the existing plugins and
`packages/canvas` declare in their `package.json`.

`--configLoader runner` is not optional. Under vite's default `bundle` loader the bare
specifier in the harness config is left external, so node loads
`@jiscribe/canvas-sdk/testing/vite-config` itself and has to read raw TypeScript; the runner
loader puts the config through vite's own pipeline instead. (canvas's harness imports the
kit relatively and so does without the flag.)

`tsconfig.json` — the two new roots need type-checking as well:

```json
{
	"include": ["src", "e2e", "playwright.config.ts"]
}
```

`playwright.config.ts` at the package root. `testDir` and the harness command are the only
suite-specific parts; the kit picks a free port per run and hands it over, so the command
must pin exactly that port:

```ts
import { createCanvasPlaywrightConfig } from "@jiscribe/canvas-sdk/testing/playwright-config";

export default createCanvasPlaywrightConfig({
	testDir: "./e2e/specs",
	harnessCommand: (port) => `pnpm dev:harness --port ${port} --strictPort`,
});
```

`e2e/harness/vite.config.ts`:

```ts
import { createPluginHarnessViteConfig } from "@jiscribe/canvas-sdk/testing/vite-config";

export default createPluginHarnessViteConfig();
```

`e2e/harness/index.html` — a `#root` element and the entry module are all
`mountPluginHarness` asks for:

```html
<!doctype html>
<html lang="ja">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Canvas E2E Harness</title>
	</head>
	<body>
		<div id="root"></div>
		<script type="module" src="/main.tsx"></script>
	</body>
</html>
```

`e2e/harness/main.tsx`:

```tsx
import { mountPluginHarness } from "@jiscribe/canvas-sdk/testing/harness";
import {
	annotationPlugin,
	annotationStencilCategory,
} from "@jiscribe/plugin-annotation-shapes";

// This package's shapes only, so a spec failing here is this package's own fault.
mountPluginHarness({
	plugins: [annotationPlugin],
	stencilLibrarySections: [annotationStencilCategory],
	pinnedCategoryIds: [annotationStencilCategory.id],
});
```

Two things that file has to get right:

- **Load the plugin by its own package name**, not through `../../src`. That is the route an
  external author has, and taking it is what proves the package's `exports` suffice on their
  own.
- **Put on the canvas only what the specs draw**, through the three stencil parameters of
  the kit (`packages/canvas/e2e/kit/mountPluginHarness.tsx`):
  - `railPresetIds` — the presets at the top of the rail, for a plugin preset a spec places
    from its rail button (`CanvasDriver.drawShape` / `placeShape`). Omitted, the rail holds
    core's primitives. A list passed here must keep `rect`, because `CanvasDriver.goto()`
    waits for the "Rectangle" tool before handing the page over.
  - `stencilLibrarySections` — the library, for a plugin category: the catalog lists it,
    and the catalog button is drawn only while it holds a section.
  - `pinnedCategoryIds` — the sections pinned on the rail at mount, for a spec opening a
    category from its rail button (`CanvasDriver.drawShapeFromFlyout` /
    `placeShapeFromFlyout`). Unpinned, a category is on the rail only while the
    document uses it (see [Moving a shape out of the engine](#moving-a-shape-out-of-the-engine)),
    and is otherwise reached through the catalog.

  The toolbar is always core's default bar (undo / redo, zoom, the properties toggle and
  so on). A plugin's presets and categories are absent from the canvas defaults, so without
  these parameters the specs cannot reach them at all.

Specs take everything from the spec entry:

```ts
import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";
```

Run the suite with `pnpm --filter @jiscribe/plugin-annotation-shapes test:e2e`, or start the
harness alone with `dev:harness` to look at it by eye. `vitest.config.ts` includes
`src/**/__tests__/` only, so the Playwright specs stay out of `pnpm test`.

## Boundaries the linter enforces

`eslint.config.js` fails the build on all of these.

- Nothing under a plugin's `src/` may import `@jiscribe/canvas/unstable` or
  `@jiscribe/doc/unstable`. Use `@jiscribe/canvas-sdk`, or
  `@jiscribe/canvas-sdk/doc` for the headless side.
- A plugin's `src/schema/`, `src/doc.ts` and `src/tools.ts` (or `src/tools/`) are
  headless. Of the canvas and doc entries they may use `@jiscribe/doc` and
  `@jiscribe/canvas-sdk/doc` (`/tools`) only — not
  the UI entries, not `react` / `react-dom` / `@emotion/*`, and not the package's
  own UI-side layers (`presentation/`, `state/`, `menu/` and the rest;
  `eslint.config.js` has the list).
- **Import through package roots.** `@jiscribe/geometry`, never
  `@jiscribe/geometry/src/...`.
- `packages/canvas-sdk`, like a plugin, sees only the canvas public entries — never
  canvas's `src/`. It is allowed more of them than a plugin, though:
  `@jiscribe/canvas/unstable`, `@jiscribe/canvas/testing*` and
  `@jiscribe/doc/unstable` are open to it, since re-exporting them is the SDK's job.

Reuse `@jiscribe/geometry` before writing geometry of your own — it already has the
types, distance and rotation helpers, affine transforms, intersection tests, shape
conversions and their validators.

## Moving a shape out of the engine

The playbook for moving a built-in shape into a plugin.

1. **Audit what the shape uses from the engine.** If everything is already exported,
   no API change is needed. If not, add the missing pieces to canvas's `unstable` /
   doc's `unstable` first, in their own commit.
2. **Move the files before editing them**, so git records renames. The target
   layout is one folder per shape: `schema/<id>/`, `state/<id>/`,
   `presentation/<Pascal>/`.
3. **Remove it from the engine**: take out every place that names the type. The main
   ones are below; grep `packages/doc/src` and `packages/canvas/src` for the type name
   to catch the rest.
   - the `ObjectTypes` union (`packages/doc/src/model/objects/types/ObjectType.ts`)
   - the headless `builtinObjectDocDefinitions` (`packages/doc/src/plugin/builtinObjectDocDefinitions.ts`)
   - the UI `BUILTIN_OBJECT_DEFINITIONS` (`packages/canvas/src/controllers/registries/applyObjectDefinition.ts`)
   - the places naming its preset: `DEFAULT_RAIL_PRESET_IDS` (`packages/canvas/src/controllers/ui/menu/StencilRail/stencilRailConfig.ts`) and `basicStencilCategory`'s `presetIds` (`packages/canvas/src/controllers/ui/objects/StencilCategory.ts`)
4. **Handle the fallout in the engine's own tests.** Engine tests that used the shape
   as a representative — "a shape with an outline", "a click-placed shape" — lose
   their subject. Declare a minimal type in the test instead of reaching for another
   built-in; `controllers/__tests__/support/clickPlacedPlugin.ts` is the precedent, and
   `e2e/plugins/specShapesPlugin.tsx` is the same idea for the e2e specs.
5. **Move the shape's e2e specs into the plugin's own suite** (above). The engine's suite
   keeps only what it can still drive with core types and the stand-in plugin.
6. **Wire every host** (below).
7. **Verify** (below).

Placement is a separate decision from packaging: a category
(`containerStencilCategory`, `annotationStencilCategory`), typed `StencilCategory`,
is owned by the plugin and composed by the host into `stencilLibrary.sections`,
where it becomes a section of the library — a row of the rail's catalog, and, once
pinned or while the open document uses one of its types that no rail preset creates,
a button on the rail opening its presets in a panel (a category whose presets all
share a rail preset's type gets that button from a pin alone). Which categories start
pinned is the host's `initialConfig.pinnedCategoryIds`; after that the pins are the
user's. A plugin preset can also sit on the rail itself, named in `rail.presetIds`.
The standard set files every plugin category in `standardStencilLibrarySections`
(`packages/standard-shapes`), puts six presets on the rail
(`standardRailPresetIds`) and pins `standardDefaultPinnedCategoryIds` to start
with. Plugin categories are not part of any canvas default, so a host that
declares no library will not show the shape until it adds the category.

A category with more presets than it can list (an icon set with hundreds of
glyphs) lists a curated few in `presetIds`, registers every preset as a stencil all
the same, and declares `search` (`StencilCategorySearch`): a function answering a
library query with registered preset ids in rank order, cut to the category's own
cap, plus `matchCount` before the cut. A stencil panel — the catalog searching every
category, or the category's own panel searching it alone — shows those after the
label matches of the listed presets, drops ids already shown or not registered, adds
a line when anything was cut, and in the category's panel, while not searching,
points to the search from under the listed presets.

## Wiring checklist

**The headless `./doc` side is the one that gets forgotten.** Work through every
list mechanically.

For every type you add:

- [ ] `packages/doc-schema/generator/src/manifest.ts` (add the type name to `CANONICAL_TYPE_ORDER`, the order of the schema and AI docs; generation fails on a missing or a leftover entry)

When a new plugin package joins the shipped set, wire both halves as well.

UI plugin (`somePlugin`):

- [ ] `packages/standard-shapes/src/index.ts` (`standardPlugins`, and `standardStencilLibrarySections`, which puts the shapes in the library; the VSCode extension, the MCP viewer and the CLI preview all take the set from there)
- [ ] `apps/canvas-examples/src/examples/plugins.tsx` (`plugins` and `stencilLibrarySections`)
- [ ] `apps/canvas-examples/e2e/harness/main.tsx` (`plugins` and `stencilLibrarySections`)

Headless doc plugin (`someDocPlugin`):

- [ ] `packages/standard-shapes/src/doc.ts` (`standardDocPlugins`; the VSCode extension's diagnostics, schema generation, the MCP server and `doc-tools` all take the set from there)

AI tools (`someAiToolPlugin`), when the plugin offers any:

- [ ] `packages/standard-shapes/src/tools.ts` (`standardAiToolPlugins`; the MCP server takes the set from there)

Only `packages/standard-shapes` and `apps/canvas-examples` take the plugin as a
`package.json` dependency; the other hosts (the VSCode extension, MCP, the CLI) depend
on `@jiscribe/standard-shapes` alone and stay untouched. `packages/canvas` is
deliberately not on the list: it depends on no shipped plugin, and adding one would
bring back the `canvas → plugins → canvas-sdk → canvas` cycle.

> **What an unwired host does:** parsing does not fail. The result is still
> `kind: "ok"` and the objects of that type are **silently dropped** from `root`
> (with a warning). It is easy to miss in testing, which is why the list above is
> worked through mechanically rather than by inspection. The behaviour is pinned by
> every plugin's parse-check suite (`createParseCheckSuite`; e.g.
> `plugins/sticky-shape/src/__tests__/stickyParseCheck.test.ts`).

Downstream products that embed the canvas have their own wiring; adding a shape to
the shipped set means updating them as well.

## Verification

```bash
pnpm lint --fix && pnpm format && pnpm typecheck && pnpm dep:check && pnpm lint
pnpm test
pnpm generate:schema   # regenerates packages/doc-schema/assets — commit the diff
pnpm build:examples && pnpm build:vscode
pnpm --filter @jiscribe/plugin-<name> test:e2e             # the shape's own suite, in full
pnpm --filter @jiscribe/canvas test:e2e specs/smoke specs/shapes/draw
pnpm --filter canvas-examples test:e2e                     # plugin coexistence
```

When a shape is _moved_ rather than added, `pnpm generate:schema` producing **no diff**
is the evidence that the doc definition came across faithfully. When a shape is
added, the diff is the new schema and it must be committed — CI's `check:schema` fails
on drift.
