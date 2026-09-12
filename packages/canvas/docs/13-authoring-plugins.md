> 🌐 日本語版: [13-authoring-plugins.ja.md](./13-authoring-plugins.ja.md)

# Authoring Plugins

The practical side of [Plugin Architecture](./12-plugin-architecture.md): how a
shape package is laid out, what the authoring kit gives you, where a piece of code
belongs, and the wiring you must not forget.

Every package under `plugins/` is a worked example. `sticky-shape` is the
smallest complete one; `container-shapes` shows a type-specific selection control;
`uml-shapes` shows multiple text slots.

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

The below-label parts go together: register the region as the type's `textRegion`
and the bounds as its `visualBounds` — without the latter, zoom-to-fit and the
export viewBox crop the label away — and place the hit area inside the shape's own
`data-kind="object"` group so the label can be grabbed.

A shape that hand-draws instead of going through `createFrameObject` has to redo
what that helper resolved (the sticky is the example). Colors above all: resolve
them with `resolveAutoColor(fill, "surface")` and **apply the result through CSS,
not the SVG `fill` attribute** — `"auto"` resolves to a `var(--jiscribe-*)` token
that presentation attributes do not evaluate, so an attribute leaves the shape
painted black (#38 / #206).

A type's properties-sidebar sections are declared as `propertyPanel`, and a row of its own is a `{ type: "custom"; id; component }` item built from the sidebar widgets the kit re-exports (`PropertyRow` and friends). A section that has nothing to say for a given selection carries `isShown`, which takes its heading away with its rows — see doc 12 for both.

`./testing` is a separate entry so vitest never reaches a runtime bundle.

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
	toolbarItems: [
		{ type: "stencilPreset", presetId: "rect" },
		{ type: "stencilCategory", category: annotationStencilCategory },
	],
});
```

Two things that file has to get right:

- **Load the plugin by its own package name**, not through `../../src`. That is the route an
  external author has, and taking it is what proves the package's `exports` suffice on their
  own.
- **Keep `toolbarItems` down to what the specs draw** — this plugin's pinned presets or its
  category (as a `{ type: "stencilCategory", category }` item), plus `{ type: "stencilPreset", presetId: "rect" }`, which is always required
  because `CanvasDriver.goto()` waits for the "Rectangle" tool button before handing the page
  over. The items are the bar's shape tools only: the kit
  (`packages/canvas/e2e/kit/mountPluginHarness.tsx`) puts the shape library toggle and a
  divider before them and appends the rest of core's default bar after them (undo / redo,
  zoom, the properties toggle and so on), so the page keeps those without naming them. The
  toggle and its divider survive only when `stencilLibrarySections` is passed; without it
  they are dropped at resolution, so the example above shows no toggle. A plugin's presets
  and categories are absent from the canvas default bar, so without items the specs cannot
  reach them at all.

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
- A plugin's `src/schema/` and `src/doc.ts` are headless. Of the canvas and doc
  entries they may use `@jiscribe/doc` and `@jiscribe/canvas-sdk/doc` only — not
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
   - the places naming its preset: `DEFAULT_TOOLBAR_TOOLS_SECTION` (`packages/canvas/src/controllers/ui/menu/Toolbar/toolbarSections.ts`) and `basicStencilCategory`'s `presetIds` (`packages/canvas/src/controllers/ui/objects/StencilCategory.ts`)
4. **Handle the fallout in the engine's own tests.** Engine tests that used the shape
   as a representative — "a shape with an outline", "a click-placed shape" — lose
   their subject. Declare a minimal type in the test instead of reaching for another
   built-in; `controllers/__tests__/support/clickPlacedPlugin.ts` is the precedent, and
   `e2e/plugins/specShapesPlugin.tsx` is the same idea for the e2e specs.
5. **Move the shape's e2e specs into the plugin's own suite** (above). The engine's suite
   keeps only what it can still drive with core types and the stand-in plugin.
6. **Wire every host** (below).
7. **Verify** (below).

Toolbar placement is a separate decision from packaging: a category
(`containerStencilCategory`, `annotationStencilCategory`), typed `StencilCategory`,
is owned by the plugin and composed by the host. One declaration serves two
places — `stencilLibrary.sections`, where it becomes a section of the shape
library sidebar, and optionally `toolbar.sections`, where wrapped as
`{ type: "stencilCategory", category }` it becomes a category flyout on the bar. The standard set files every plugin category as a sidebar
section in `standardStencilLibrarySections` (`packages/standard-shapes`) and pins
only presets on the bar. Plugin categories are not part of
`DEFAULT_TOOLBAR_SECTIONS`, so a host that uses the default bar unchanged and
declares no library will not show the shape until it adds the category.

## Wiring checklist

**The headless `./doc` side is the one that gets forgotten.** Work through every
list mechanically.

For every type you add:

- [ ] `packages/doc-schema/generator/src/manifest.ts` (add the type name to `CANONICAL_TYPE_ORDER`, the order of the schema and AI docs; generation fails on a missing or a leftover entry)

When a new plugin package joins the shipped set, wire both halves as well.

UI plugin (`somePlugin`):

- [ ] `packages/standard-shapes/src/index.ts` (`standardPlugins`, and `standardStencilLibrarySections`, which puts the shapes in the sidebar; the VSCode extension, the MCP viewer and the CLI preview all take the set from there)
- [ ] `apps/canvas-examples/src/examples/plugins.tsx` (`plugins` and `stencilLibrarySections`)
- [ ] `apps/canvas-examples/e2e/harness/main.tsx` (`plugins` and `stencilLibrarySections`)

Headless doc plugin (`someDocPlugin`):

- [ ] `packages/standard-shapes/src/doc.ts` (`standardDocPlugins`; the VSCode extension's diagnostics, schema generation, the MCP server and `doc-tools` all take the set from there)

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
