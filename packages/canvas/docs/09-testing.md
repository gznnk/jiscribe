> 🌐 日本語版: [09-testing.ja.md](./09-testing.ja.md)

# Testing

Testing for canvas is structured as **two layers — unit (vitest) → E2E (Playwright)** — plus a dependency check.
Its pure-function-centric design ([Design Philosophy](./01-design-philosophy.md), Principle 2) is what makes this structure possible.

## Drawing the line between unit and E2E (Detroit school)

We do not decide "unit or integration" based on **code granularity** (one function vs. multiple modules).
Following the Detroit school (classical) definition, we call a test a unit test when it satisfies the following three conditions.

1. It verifies a **unit of behavior** — not a unit of code
2. It runs **fast**
3. It is **isolated from other tests** (holds no shared mutable state)

The axis for the split is the **process boundary**. If a test crosses an **out-of-process dependency such as a real DOM, browser, file system, or network, it is an integration (E2E)** test; if it does not, it is a unit test.
Even a test that bundles several real collaborators (Command / Registry / `canvasReducer`, etc.) to verify a single behavior is **a unit test** as long as it stays in-process and is fast and deterministic.

- **solitary** … verifies a single pure function in isolation (Mapper round-trips, `validateXxxDoc`, etc.)
- **sociable** … bundles real collaborators to verify behavior through an entry point
  (Undo/Redo via `canvasReducer`, the real command path via `handleCommand`, etc.)

Both solitary and sociable tests belong to the **same unit layer**, and we do not separate them by folder (both live under `__tests__/`).

## Unit tests (vitest)

Each layer keeps a `__tests__/` directory **co-located** with it. State + Mapper, Controllers, validation functions,
and sociable behavior tests are placed right next to the files they target
(the co-location policy from [Architecture](./02-architecture.md)).

- The main targets are the `states` / `controllers` / `rendering` layers
  (Mapper round-trip conversions, a Command's `execute`, transformation logic, behavior via `canvasReducer`, etc.).
  The build-time helpers outside `src/` (`build/`) keep their tests in `__tests__/` the same way.
  Which files are picked up is decided by the `include` in `vitest.config.ts`.
  The Doc model's own tests (`validateXxxDoc`, the parser, the doc ops) live in `@jiscribe/doc` and run with `pnpm --filter @jiscribe/doc test`
- The default environment is `environment: "node"`: without going through the DOM, a test verifies input state → output state directly.
  Only tests that need DOM APIs (rendering a React hook or component to check it, and the like)
  switch to jsdom with `// @vitest-environment jsdom` at the top of the file
  (e.g. `controllers/hooks/__tests__/useSyncExternalDoc.test.tsx`, `controllers/__tests__/CanvasThumbnail.test.tsx`).
  jsdom is an in-process simulated DOM, so these stay in the unit layer
- Run: `pnpm --filter @jiscribe/canvas test` (`vitest run`).
  `test:coverage` / `test:ui` are also provided (for what coverage excludes, see `coverage.exclude` in `vitest.config.ts`)

### File naming conventions

| Form                    | Purpose                                                                                    | Example                            |
| ----------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------- |
| `<SUT>.test.ts`         | Default. Co-located 1:1 with the file under test                                           | `validateRectDoc.test.ts`          |
| `<SUT>.<facet>.test.ts` | When a single SUT is large and you want to **split files per facet**                       | `canvasReducer.coalescing.test.ts` |
| `<scenario>.test.ts`    | A sociable **cross-cutting regression scenario** that does not belong to a single SUT file | `copyPasteDuplicateOrder.test.ts`  |

- `<facet>` is a noun describing an aspect of behavior (`coalescing` / `undoRedo` / `externalSync`, etc.).
  **Do not use facet naming for solitary pure-function tests** (facet splitting is limited to sociable / large SUTs)
- Choosing between `<SUT>` naming and `<scenario>` naming is decided **not by whether an entry point exists, but by what the file name refers to**.
  If the file name refers to a single SUT's contract, use `<SUT>(.<facet>)`; if it refers to an invariant spanning multiple modules, use `<scenario>`.
  Even when a scenario test goes through a specific entry point (`handleCommand`, etc.), do not prefix the file name with the entry point
  — when the test fails, the place to open is the code implementing the invariant, not the entry point, and there may be more than one entry point
  (e.g. `copyPasteDuplicateOrder` drives both `handleCommand` and `handlePaste`).
  The entry point is conveyed by the folder location (table below) and the doc comment at the top of the test
- Tests of an entry point's own contract (for `handleCommand`: Registry resolution, the `canExecute` gate, etc.) use normal SUT naming
  with the entry point as the SUT, not scenario naming (e.g. `canvasReducer`'s contract lives in `canvasReducer.<facet>.test.ts`)
- Sociable tests place their `support/` — responsible for state assembly, dispatch, and fixtures — under `__tests__/support/`.
  Sharing `support/` is a future task; for now we **tolerate duplication per folder**
  (`controllers/reducer/__tests__/support/` and `controllers/commands/__tests__/support/` are separate)

#### Main sociable tests

| Location                          | Entry point     | Aspects verified                                                                                                                                                 |
| --------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `controllers/reducer/__tests__/`  | `canvasReducer` | `coalescing` (history aggregation) / `commitSources` (history record sources) / `externalSync` ([External Sync](./07-external-sync.md)) / `undoRedo` (Undo/Redo) |
| `controllers/commands/__tests__/` | `handleCommand` | The real command path (CommandRegistry resolution + `canExecute` + `execute`). Example: StackOrder when a connector is selected                                  |

## E2E (Playwright)

Non-regression tests using a real browser and real UI operations. The package that owns a
shape owns the specs for it, so there is **one suite per package** (canvas, each plugin under
`plugins/*`, and canvas-examples).

| Suite              | Location                    | Scope                                                                                                   |
| ------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------- |
| canvas             | `packages/canvas/e2e/`      | Core behavior: gestures, selection, transform, text editing, connectors, arrangement, toolbar and menus |
| each shape plugin  | `plugins/<name>/e2e/`       | That package's shapes only                                                                              |
| plugin coexistence | `apps/canvas-examples/e2e/` | What only happens with every shipped plugin on a single canvas, and checks that need the shipped fonts  |

Every suite is laid out the same way and runs on the shared kit described below.

```
<package>/
├── playwright.config.ts     # a createCanvasPlaywrightConfig call
└── e2e/
    ├── harness/             # index.html + main.tsx (mountPluginHarness) + vite.config.ts
    └── specs/
```

- `playwright.config.ts` auto-starts the harness — a minimal Vite app that mounts `Canvas` —
  via `webServer`, on a port taken from the OS ephemeral range per run, so suites can run
  side by side. The extension is not `.mts`: Playwright transpiles a config to CommonJS, and
  an ESM config cannot then take the kit's named exports
- **canvas's harness registers no shipped plugin.** It mounts `e2e/plugins/specShapesPlugin.tsx`,
  a test-only stand-in supplying the traits core no longer owns itself, one type per trait
  (e.g. `tile`: drag-drawn, in a category flyout; `pin`: click-placed; `card`: `<g>`-rooted,
  with a text slot; `panel`: declares its own creation defaults. The full set is
  `specShapesPlugin` in that file). Core specs that used a shipped shape as their subject
  drive these instead
- **A plugin's harness mounts that plugin alone.** Passing under a solo load is itself the
  evidence that the package carries no implicit dependency on another plugin
- **canvas-examples' harness mounts every shipped plugin** (`plugins` in `e2e/harness/main.tsx`).
  It looks at what only breaks when they share a canvas (e.g. ObjectType registration
  collisions, duplicated toolbar entries, `<defs>` id collisions: `specs/plugin-coexistence.spec.ts`),
  and at the PNG export's font embedding, which can be checked only here because this is the
  one harness that loads the shipped fonts (`specs/png-font-embedding.spec.ts`). How a single
  shape draws or edits is the owning plugin's suite's business. It can hold that without a
  dependency cycle because it sits at the top of the dependency graph — it depends on canvas
  and every shipped plugin, and nothing depends on it
- `support/CanvasDriver.ts` … the API for drawing, selection, text, color, and connector operations.
  `support/selectors.ts` … `data-kind` / `data-id` selector constants. `fixtures.ts` injects the CanvasDriver.
  All three live in canvas and reach the other suites through the kit
- canvas's `specs/` is split into folders by feature area. How it is split, and where a new
  spec goes, is in [`e2e/specs/README.md`](../e2e/specs/README.md)
- Run: `pnpm --filter @jiscribe/canvas test:e2e` (`:headed` / `:ui` available) /
  `pnpm --filter @jiscribe/plugin-sticky-shape test:e2e` / `pnpm --filter canvas-examples test:e2e`

Design policy: **the CanvasDriver has no retries that hide failures**. It stabilizes by waiting on state (`expect.poll`, etc.) rather than on time, and when an operation does not take effect it lets the test fail, so it does not mask genuine defects.
Playwright's per-test retries are turned on only in CI, by the shared kit's `createCanvasPlaywrightConfig` (a local run never retries).

Non-regression for the gesture spec corresponds to the [Gesture System](./04-gesture-system.md)
(`specs/shapes/basic-gestures.spec.ts` / `specs/editing/text-edit-gestures.spec.ts`, etc.).

### The shared kit

The implementation lives in canvas under `e2e/kit/` and is exported as **one entry per file
of a suite**. Plugins take the same kit through `@jiscribe/canvas-sdk`.

| File in a suite              | canvas entry                                 | Plugin entry                                     |
| ---------------------------- | -------------------------------------------- | ------------------------------------------------ |
| spec files                   | `@jiscribe/canvas/testing`                   | `@jiscribe/canvas-sdk/testing/e2e`               |
| `playwright.config.ts`       | `@jiscribe/canvas/testing/playwright-config` | `@jiscribe/canvas-sdk/testing/playwright-config` |
| `e2e/harness/vite.config.ts` | `@jiscribe/canvas/testing/vite-config`       | `@jiscribe/canvas-sdk/testing/vite-config`       |
| `e2e/harness/main.tsx`       | `@jiscribe/canvas/testing/harness`           | `@jiscribe/canvas-sdk/testing/harness`           |

It is split that way because each of those files is loaded by a different runtime, and none
of them tolerates the others' imports.

- Importing the spec entry registers Playwright fixtures, which throws under any other
  loader — `playwright.config.ts` included
- The vite config entry is kept apart from the Playwright config entry so that loading a
  config, which Playwright transpiles to CommonJS, never has to `require()` vite, which
  ships ESM only
- The harness entry is browser code, while the others reach for `@playwright/test`,
  `node:child_process` and vite, none of which can be bundled into a page

The API is `createCanvasPlaywrightConfig` / `createPluginHarnessViteConfig` /
`mountPluginHarness`, plus `test` / `expect` / `CanvasDriver` / `selectors` and the like on
the spec side (see each file under `e2e/kit/` for the parameters). canvas itself imports the
kit relatively (`./e2e/testing-playwright-config`), never through the SDK: the
`canvas → canvas-sdk → canvas` cycle is what this split removed. Standing up a suite for a
plugin is walked through in [Authoring Plugins](./13-authoring-plugins.md).

## Circular dependency check (madge)

madge (`dep:check` = `madge --circular`) detects cycles in the module graph. It reports
cycles only, so an import that runs against the one-way dependency between layers
([Architecture](./02-architecture.md)) goes unnoticed unless it closes a cycle. That is
caught by `no-restricted-imports` in the repository root's `eslint.config.js`: a value
imported from a higher layer into a lower one inside `controllers/`, and a value imported
from `controllers/` into `rendering/` (type imports are allowed).

- Run: `pnpm dep:check` (whole workspace) / `pnpm --filter @jiscribe/canvas dep:check` (canvas only).
  A backward layer import fails `pnpm lint`
- The CI `checks` job runs `pnpm dep:check` and `pnpm lint` as well

## Running everything at once (checks on task completion)

After making changes, run the following in order (the project-wide procedure).

```bash
pnpm lint --fix
pnpm format
pnpm build:examples
pnpm typecheck
pnpm dep:check
pnpm lint
pnpm --filter @jiscribe/canvas test
```
