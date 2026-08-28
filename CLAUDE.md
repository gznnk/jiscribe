# CLAUDE.md

Guidance for Claude Code and other AI assistants working in this repository.

## What this is

Jiscribe is an SVG diagram canvas engine for React, published as a pnpm
workspace. `packages/canvas` is the engine; `plugins/*` are the shipped shape
sets, written against the engine's public API only; `apps/canvas-examples` and
`apps/vscode-extension` are the consumers that keep the API honest.

Stack: pnpm 11 workspaces, React 19, TypeScript 5.9, Vite 7, Vitest, Playwright,
ESLint 9, Prettier. React Compiler is not used.

## Layout

```
packages/
  doc/               the document layer: model, plugin contract, parser, ops, text metrics, .jis.png/.jis.svg I/O
  canvas/            engine (rendering, gestures, commands, state) + its e2e suite and the shared e2e kit
  canvas-sdk/        shape-authoring kit for plugin authors
  geometry/          geometry types and calculations
  markdown/          markdown rendering
  basic-validators/  primitive runtime validators
  utility-types/     shared TypeScript utility types
  doc-schema/        generated JSON Schema / AI reference for the shipped shapes
  ai-tools/          the canvas tool set an AI can call: the declaration, and the applying side under ./apply (node) and ./client (browser)
  standard-shapes/   the shipped shape set, bundled once for every host (doc + presentation entries)
  doc-tools/         validate / measure / diagnose over the standard set (Node text measurer included)
plugins/             flowchart, uml, container, general, annotation, sticky, markdown, lucide-icon — each with its own e2e suite
apps/
  canvas-examples/   integration examples (one example = one file) + the plugin-coexistence e2e suite
  vscode-extension/  the VSCode extension
  cli/               the jiscribe CLI: validate / diagnose / measure / render (headless browser harness)
  mcp/               the MCP server: the tool set over stdio, plus a local canvas viewer people can edit in
```

Playwright e2e is spread over ten suites, one per package that owns shapes:
`packages/canvas/e2e/` (core, on a harness registering no shipped plugin),
`plugins/<name>/e2e/` (that plugin alone), and `apps/canvas-examples/e2e/` (one spec:
all eight plugins on a single canvas). Each has its own `playwright.config.ts` and runs
as `pnpm --filter <package> test:e2e`. They share canvas's kit, which plugins reach
through `@jiscribe/canvas-sdk/testing/*` — see `packages/canvas/docs/09-testing.md`.

## After making a change

Always:

```bash
pnpm lint --fix
pnpm format
pnpm typecheck
pnpm dep:check
pnpm lint
```

Then, by impact:

- **Unit tests for what you touched**: `pnpm --filter @jiscribe/canvas test`
- **Behaviour or rendering**: run e2e from the suite that owns what you touched, and
  only the related specs.
  - `packages/canvas/src/{gestures,controllers,rendering,states}`: select by
    keyword, e.g. `pnpm --filter @jiscribe/canvas test:e2e specs/shapes/connector`.
    Do not run that suite in full (160+ spec files); CI does it on pull requests to
    `main`.
  - a plugin's shapes: run its whole suite, which is a handful of specs, e.g.
    `pnpm --filter @jiscribe/plugin-uml-shapes test:e2e`.
  - plugin registration, toolbar composition or `svgDefs`:
    `pnpm --filter canvas-examples test:e2e`.

  If no spec matches, cover it with a unit test instead.

- **Shapes or AI-facing metadata** (new shape, `ObjectFeatures`, `description`,
  `defaults`): run `pnpm generate:schema` and commit the regenerated
  `packages/doc-schema/assets/`, or CI's `check:schema` fails on the drift.
- **Anything an app consumes**: `pnpm build:examples` / `pnpm build:vscode`

## Rules that are enforced, not suggested

ESLint fails on all of these — see `eslint.config.js` for the exact patterns.

- Packages under `plugins/` may only import `@jiscribe/canvas`, `@jiscribe/doc`,
  `@jiscribe/canvas-sdk` and its `/doc` entry point. `@jiscribe/canvas/unstable`,
  `@jiscribe/doc/unstable`, deep `@jiscribe/doc/*` paths and any `src/` path are
  rejected.
- The headless document layer (`packages/doc` — the document model, plugin
  contract, parser, ops, text metrics and file I/O — plus the equivalent layers
  in `canvas-sdk` and the plugins) must not import `react`, `react-dom`,
  `@emotion/*`, or `@jiscribe/canvas`. Canvas keeps `./doc` / `./unstable-doc` /
  `./png-source` / `./svg-source` as re-export shims over `@jiscribe/doc`.
- Import through package roots (`@jiscribe/geometry`), never `src/` paths.
- `as unknown as` is banned under `packages/canvas/src/states` and
  `packages/doc/src/{model,plugin,parse}`; use `rebrand<T>()`.

## Reuse `@jiscribe/geometry`

Before writing any geometric type or calculation, read `packages/geometry/src/`.
It already has `Point`, `Rect`, `Frame`, `Ellipse`, `Transform`, `BoundingBox`,
`KeyPoints`, key-point and bounding-box calculation, intersection tests, shape
conversions, distance and rotation helpers, affine transforms, degree/radian
conversion, and validators for all of it. Reuse or extend rather than
reimplement.

## Conventions

Naming, comment and JSDoc rules are in [CONTRIBUTING.md](./CONTRIBUTING.md) —
follow that document, it is the same standard applied in review. The short
version: names carry their meaning without context; comments explain what the
code cannot; every parameter of a public API gets a `@param` that adds a fact
the name does not already give.

In-code comments are written in English. Match the comment density and idiom of
the file you are editing.

## Committing

Commit only when explicitly asked. Do not commit as a follow-up to unrelated
work, and do not ask "should I commit?" at the end of a task.

Commit messages follow Conventional Commits with an optional scope:
`fix(canvas): ...`, `feat(vscode): ...`.
