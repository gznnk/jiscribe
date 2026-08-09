> 🌐 日本語版: [13-authoring-plugins.ja.md](./13-authoring-plugins.ja.md)

# Authoring Plugins

The practical side of [Plugin Architecture](./12-plugin-architecture.md): how a
shape package is laid out, what the authoring kit gives you, where a piece of code
belongs, and the wiring you must not forget.

The seven packages under `plugins/` are the worked examples. `sticky-shape` is the
smallest complete one; `container-shapes` shows a type-specific selection control;
`uml-shapes` shows multiple text slots.

## Package layout

```
plugins/sticky-shape/
├── package.json
└── src/
    ├── index.ts          public exports (plugin, toolbar entry, anything a host needs)
    ├── plugin.ts         the CanvasPlugin declaration
    ├── doc.ts            the CanvasDocPlugin declaration — headless entry
    ├── definition.ts     the ObjectTypeDefinition (UI half)
    ├── schema/           Doc type, defaults, features, doc validator
    ├── state/            State type, mapper, state validator
    ├── presentation/     the React component and its <defs>
    ├── stencil/          palette icon and stencil entries
    ├── menu/             custom ObjectMenu items, if any
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

The headless half is written first, because the UI half takes it as input:

```ts
// src/doc.ts
export const stickyDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: StickyFeatures,
	defaults: STICKY_DOC_DEFAULTS,
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
export const stickyDefinition: ObjectTypeDefinition<StickyDoc, StickyState> =
	createFrameObjectDefinition<StickyDoc, StickyState>({
		doc: stickyDocDefinition,
		component: Sticky,
		svgDefs: StickyDefs,
		stencils: StickyStencils,
		menu: [
			/* … */
		],
	});
```

```ts
// src/plugin.ts
export const stickyPlugin: CanvasPlugin = {
	id: "sticky-shape",
	objects: { sticky: stickyDefinition },
};
```

## Where a piece of code belongs

Three layers, with a test for each.

| Layer                 | Holds                                                                                       | The test                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `packages/canvas`     | `createFrame*` family, the `ObjectTypeDefinition` contract, registries                      | **Touches engine internals** — the state model, registries, theme, internal validator vocabulary. Add conservatively |
| `packages/canvas-sdk` | Authoring helpers, plugin-only parts, re-exports of canvas `unstable`                       | **Writable with the canvas public API alone.** Promote once the same shape appears in two plugins                    |
| a plugin's `shared/`  | Family-specific bases (pictogram in `general-shapes`, group markers in `annotation-shapes`) | **Vocabulary of that shape family only.** Move to the SDK once another family starts using it                        |

Two things pull a helper back into `packages/canvas` even when it looks like SDK
material: dependence on a non-public context (the theme context) or on internal
validator vocabulary. Those stay in canvas and the SDK re-exports them, because
physically moving them would widen the canvas public surface instead of narrowing it.

## What the authoring kit gives you

`@jiscribe/canvas-sdk` re-exports the whole of `@jiscribe/canvas/unstable`
(and `/doc` re-exports `unstable-doc`), so it is a superset — you never need to
reach past it. On top of that:

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

`./testing` is a separate entry so vitest never reaches a runtime bundle.

## Boundaries the linter enforces

`eslint.config.js` fails the build on all of these.

- Nothing under a plugin's `src/` may import `@jiscribe/canvas/unstable` or
  `@jiscribe/canvas/unstable-doc`. Use `@jiscribe/canvas-sdk`, or
  `@jiscribe/canvas-sdk/doc` for the headless side.
- A plugin's `src/schema/` and `src/doc.ts` are headless. They may use
  `@jiscribe/canvas/doc` and `@jiscribe/canvas-sdk/doc` only — not the UI entries,
  not `react` / `react-dom` / `@emotion/*`, and not the package's own
  `presentation/`, `state/`, `stencil/`, `controls/` or `menu/` directories.
- **Import through package roots.** `@jiscribe/geometry`, never
  `@jiscribe/geometry/src/...`.
- `packages/canvas-sdk` lives under the same rules as a plugin: it sees only the
  canvas public entries.

Reuse `@jiscribe/geometry` before writing geometry of your own — it already has the
types, distance and rotation helpers, affine transforms, intersection tests, shape
conversions and their validators.

## Moving a shape out of the engine

The playbook, from seven rounds of doing it.

1. **Audit what the shape uses from the engine.** If everything is already exported,
   no API change is needed. If not, add the missing pieces to `unstable` /
   `unstable-doc` first, in their own commit.
2. **Move the files before editing them**, so git records renames. The target
   layout is one folder per shape: `schema/<id>/`, `state/<id>/`,
   `presentation/<Pascal>/`.
3. **Remove it from the engine**: the `ObjectTypes` union, `builtinObjectDocDefinitions`,
   `initializeObjectRegistry`, and `DEFAULT_TOOLBAR_LAYOUT`.
4. **Handle the fallout in the engine's own tests.** Engine tests that used the shape
   as a representative — "a shape with an outline", "a click-placed shape" — lose
   their subject. Declare a minimal type in the test instead of reaching for another
   built-in; `controllers/__tests__/support/clickPlacedPlugin.ts` is the precedent.
5. **Wire every host** (below).
6. **Verify** (below).

Toolbar placement is a separate decision from packaging: a category flyout entry
(`containerToolbarEntry`, `annotationToolbarEntry`) is owned by the plugin and
composed by the host into `toolbar.layout`. Plugin categories are not part of
`DEFAULT_TOOLBAR_LAYOUT`, so a host that uses the default layout unchanged will not
show the shape until it adds the entry.

## Wiring checklist

**The headless `./doc` side is the one that gets forgotten.** Work through both
lists mechanically.

UI plugin (`somePlugin`):

- [ ] `apps/canvas-examples/src/examples/plugin-container.tsx`
- [ ] `apps/vscode-extension/src/webview/canvasParser.ts`
- [ ] `apps/vscode-extension/src/webview/index.tsx` (`toolbarLayout`)
- [ ] `packages/canvas/e2e/harness/main.tsx` (`plugins` and `toolbarLayout`)

Headless doc plugin (`someDocPlugin`):

- [ ] `apps/vscode-extension/src/diagnostics/DiagnosticProvider.ts`
- [ ] `packages/ai-docs/generator/src/manifest.ts` (`definitionSources`)

Add the dependency to each of those packages' `package.json` too — including
`packages/canvas`'s `devDependencies`, which the e2e harness reads.

> **What an unwired host does:** parsing does not fail. The result is still
> `kind: "ok"` and the objects of that type are **silently dropped** from `root`
> (with a warning). It is easy to miss in testing, which is why the list above is
> worked through mechanically rather than by inspection. The behaviour is pinned by
> `plugins/sticky-shape/src/__tests__/stickyParseCheck.test.ts`.

Downstream products that embed the canvas have their own wiring; adding a shape to
the shipped set means updating them as well.

## Verification

```bash
pnpm lint --fix && pnpm format && pnpm typecheck && pnpm dep:check && pnpm lint
pnpm test
pnpm generate:ai   # regenerates packages/ai-docs/assets — commit the diff
pnpm build:examples && pnpm build:vscode
pnpm --filter @jiscribe/canvas test:e2e specs/smoke specs/shapes/draw
```

When a shape is _moved_ rather than added, `pnpm generate:ai` producing **no diff**
is the evidence that the doc definition came across faithfully. When a shape is
added, the diff is the new schema and it must be committed — CI's `check:ai` fails
on drift.

E2E specs for plugin shapes live in `packages/canvas/e2e/specs/shapes/`, alongside
the built-in ones; plugin packages have no e2e harness of their own.
