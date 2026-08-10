# CLAUDE.md

Guidance for Claude Code and other AI assistants working in this repository.

## What this is

Jiscribe is an SVG diagram canvas engine for React, published as a pnpm
workspace. `packages/canvas` is the engine; `plugins/*` are the shipped shape
sets, written against the engine's public API only; `apps/canvas-examples` and
`apps/vscode-extension` are the consumers that keep the API honest.

Stack: pnpm 10 workspaces, React 19, TypeScript 5.9, Vite 7, Vitest, Playwright,
ESLint 9, Prettier. React Compiler is not used.

## Layout

```
packages/
  canvas/            engine (rendering, gestures, commands, state, schema) + e2e suite
  canvas-sdk/        shape-authoring kit for plugin authors
  geometry/          geometry types and calculations
  markdown/          markdown rendering
  basic-validators/  primitive runtime validators
  utility-types/     shared TypeScript utility types
  ai-docs/           generated JSON Schema / AI reference for the shipped shapes
plugins/             flowchart, uml, container, general, annotation, sticky, markdown
apps/
  canvas-examples/   integration examples (one example = one file)
  vscode-extension/  the VSCode extension
```

The Playwright e2e suite lives in `packages/canvas/e2e/`, not in the example app.

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
- **Behaviour or rendering** (`packages/canvas/src/{gestures,controllers,presentations,states}`):
  run only the related e2e specs, selected by keyword — e.g.
  `pnpm --filter @jiscribe/canvas test:e2e specs/shapes/connector`. Do not run
  the full suite (140+ specs); CI does that on pull requests to `main`. If no
  spec matches, cover it with a unit test instead.
- **Shapes or AI-facing metadata** (new shape, `ObjectFeatures`, `description`,
  `defaults`): run `pnpm generate:ai` and commit the regenerated
  `packages/ai-docs/assets/`, or CI's `check:ai` fails on the drift.
- **Anything an app consumes**: `pnpm build:examples` / `pnpm build:vscode`

## Rules that are enforced, not suggested

ESLint fails on all of these — see `eslint.config.js` for the exact patterns.

- Packages under `plugins/` may only import `@jiscribe/canvas`,
  `@jiscribe/canvas-sdk` and their `/doc` entry points. `@jiscribe/canvas/unstable`
  and any `src/` path are rejected.
- The headless document layer (`packages/canvas/src/doc.ts`, `schemas/`,
  `docOps/`, and the equivalent layers in `canvas-sdk` and the plugins) must not
  import `react`, `react-dom`, `@emotion/*`, or the presentation / controller /
  state layers.
- Import through package roots (`@jiscribe/geometry`), never `src/` paths.
- `as unknown as` is banned under `packages/canvas/src/states` and `schemas`;
  use `rebrand<T>()`.

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
