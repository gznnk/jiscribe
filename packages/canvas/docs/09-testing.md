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

- Targets are the `schemas` / `states` / `controllers` / `presentations` layers
  (Mapper round-trip conversions, `validateXxxDoc`, a Command's `execute`, transformation logic, behavior via `canvasReducer`, etc.)
- `vitest.config.ts` uses `environment: "node"`. Without going through the DOM, it verifies input state → output state directly
- Run: `pnpm --filter @workspace/canvas test` (`vitest run`).
  `test:coverage` / `test:ui` are also provided (coverage excludes `index.ts` and `vitest.config.ts`)

```
src/**/__tests__/**/*.{test,spec}.{ts,tsx}
```

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
- Tests of `handleCommand`'s own contract (Registry resolution, the `canExecute` gate, etc.) use normal SUT naming
  as `handlers/__tests__/handleCommand.test.ts`, not scenario naming
- Sociable tests place their `support/` — responsible for state assembly, dispatch, and fixtures — under `__tests__/support/`.
  Sharing `support/` is a future task; for now we **tolerate duplication per folder**
  (`controllers/reducer/__tests__/support/` and `controllers/commands/__tests__/support/` are separate)

#### Main sociable tests

| Location                          | Entry point     | Aspects verified                                                                                                                                                 |
| --------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `controllers/reducer/__tests__/`  | `canvasReducer` | `coalescing` (history aggregation) / `commitSources` (history record sources) / `externalSync` ([External Sync](./07-external-sync.md)) / `undoRedo` (Undo/Redo) |
| `controllers/commands/__tests__/` | `handleCommand` | The real command path (CommandRegistry resolution + `canExecute` + `execute`). Example: StackOrder when a connector is selected                                  |

## E2E (Playwright)

Non-regression tests using a real browser and real UI operations. Placed under `packages/canvas/e2e/`.

- `playwright.config.mts` auto-starts a dedicated test harness app (`e2e/harness/`, a minimal Vite app that mounts `Canvas`) via `webServer`. `testDir: e2e/specs`
- `support/CanvasDriver.ts` … the API for drawing, selection, text, color, and connector operations.
  `support/selectors.ts` … `data-kind` / `data-id` selector constants. `fixtures.ts` injects the CanvasDriver
- `specs/` is the test body (the CI gate). Categories: `arrange` / `driver` / `editing` / `keyboard` /
  `scenario` / `shapes` / `ui` (+ `smoke.spec.ts`)
- Run: `pnpm --filter @workspace/canvas test:e2e` (`:headed` / `:ui` available)

Design policy: **do not add retries that hide failures**. The CanvasDriver stabilizes by waiting on state (`expect.poll`, etc.) rather than on time, so it does not mask genuine defects.

Non-regression for the gesture spec corresponds to the [Gesture System](./04-gesture-system.md)
(`specs/shapes/basic-gestures.spec.ts` / `specs/editing/text-edit-gestures.spec.ts`, etc.).

## Circular dependency check (madge)

To mechanically guarantee the one-way dependency between layers ([Architecture](./02-architecture.md)),
madge is used to detect circular dependencies.

- Run: `pnpm dep:check` (whole workspace) / `pnpm --filter @workspace/canvas dep:check` (canvas only)
- The CI `checks` job runs `pnpm dep:check` as well

## Running everything at once (checks on task completion)

After making changes, run the following in order (the project-wide procedure).

```bash
pnpm lint --fix
pnpm format
pnpm build:examples
pnpm typecheck
pnpm dep:check
pnpm lint
pnpm --filter @workspace/canvas test
```
