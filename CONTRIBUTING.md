> 🌐 日本語版: [CONTRIBUTING.ja.md](./CONTRIBUTING.ja.md)

# Contributing

Thanks for your interest in Jiscribe. This document covers what you need to get
a change merged.

## How contributions work

**Issues are welcome with no prior arrangement.** Bug reports, questions,
feature ideas, "this API is awkward to use" — these are the most useful thing
you can send, and there is no bar to clear before opening one.

**Pull requests are accepted by prior agreement only.** Open an issue first and
wait for a reply saying the change is wanted. A pull request that arrives
without that agreement will be closed with a link to this section, however good
the code is.

This is not a judgement on your patch. Jiscribe has a single maintainer, the
engine's design is still moving, and reviewing someone else's code — then
maintaining it afterwards — costs more than writing it. Settling the change in
an issue first means neither of us spends time on something that was never
going to be merged.

## Getting set up

```bash
pnpm install
pnpm dev:examples   # http://localhost:5174/
```

Node.js 22 and pnpm 10 are what CI uses. `npm` and `yarn` will not work — this
is a pnpm workspace and packages depend on each other through `workspace:*`.

## Before you open a pull request

The rest of this document assumes the change has already been agreed on in an
issue. Run these and make sure they all pass:

```bash
pnpm lint --fix
pnpm format
pnpm typecheck
pnpm dep:check
pnpm lint
```

Then, depending on what you touched:

- **Any package** — run its unit tests: `pnpm --filter @jiscribe/canvas test`
- **Behaviour or rendering** (`packages/canvas/src/{gestures,controllers,presentations,states}`)
  — run the related e2e specs, not the full suite:
  `pnpm --filter @jiscribe/canvas test:e2e specs/shapes/connector`
- **Shapes or AI-facing metadata** (a new shape, `ObjectFeatures`, `description`,
  `defaults`) — regenerate the AI assets with `pnpm generate:ai` and commit the
  result, or CI's `check:ai` will fail on the drift
- **Anything consumed by an app** — build it: `pnpm build:examples` or
  `pnpm build:vscode`

The full e2e suite is heavy; CI runs it on pull requests targeting `main`.

## Architecture rules the linter enforces

These are not style preferences — ESLint fails the build on them.

- **Plugins are external.** Packages under `plugins/` may import
  `@jiscribe/canvas`, `@jiscribe/canvas-sdk` and their `/doc` entry points.
  Reaching into `@jiscribe/canvas/unstable` or any `src/` path is rejected.
  `@jiscribe/canvas-sdk` is the single supported surface for shape authoring.
- **The document layer stays headless.** `packages/canvas/src/doc.ts`,
  `schemas/`, `docOps/` and the equivalent layers in `canvas-sdk` and the
  plugins must not import `react`, `react-dom`, `@emotion/*`, or the
  presentation / controller / state layers. This is what lets the document layer
  run in a VSCode extension host or a Node process.
- **Import through package roots.** `@jiscribe/geometry`, never
  `@jiscribe/geometry/src/...`.
- **No double casts in the Doc↔State boundary.** `as unknown as` is banned under
  `packages/canvas/src/states` and `schemas`; use `rebrand<T>()` instead.

## Reuse before you write

Geometry types and calculations belong in `@jiscribe/geometry` — `Point`,
`Rect`, `Frame`, `Ellipse`, `Transform`, `BoundingBox`, distance and rotation
helpers, affine transforms, intersection tests, degree/radian conversion, and
validators for all of them. Check `packages/geometry/src/` before adding a new
type or function anywhere else.

## Code style

- TypeScript strict mode; `@typescript-eslint/no-explicit-any` is an error
- Prettier decides formatting — tabs, double quotes, 80 columns. Run
  `pnpm format`
- `if` bodies always use braces (`curly: all`)

**Naming.** Prefer names that carry their meaning without context: `srcObj` over
`obj`, `clonedId` over `id`. Keep paired concepts symmetric (`src`/`cloned`,
`old`/`new`). Don't abbreviate into ambiguity, and don't repeat the type in the
name (`idRemap`, not `idMap`). Validators are named by return value: `is*` for
predicates returning `boolean`, `validate*` for functions returning
`SemanticDiagnostic[]`. Type guards take a parameter named `value`.

**Comments.** Write what the code cannot say: constraints, intent, non-obvious
reasons. Don't restate the code, justify the design, or compare alternatives. If
a document covers it, link to it in one line instead of summarising.

**JSDoc.** Public API — anything exported from a package's `index.ts` — documents
every parameter, even when there is only one; callers should not need to read
the implementation. Each `@param` must add something the name does not already
say: units, coordinate space, allowed range, default, edge behaviour (`NaN`,
`-0`, empty arrays, degenerate shapes), or which argument is the subject. Write
`@returns` only when the type alone is not enough. One JSDoc comment per
property — two properties sharing one comment means the editor shows nothing for
one of them. Verify any edge-case claim you write by actually evaluating it.

Comments in this repository are written in Japanese. Contributions in English
are welcome; do not machine-translate existing comments as part of an unrelated
change.

## Commits and pull requests

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
with an optional scope: `fix(canvas): ...`, `feat(vscode): ...`,
`refactor(geometry): ...`. Japanese and English subjects are both fine.

Target `main`. Link the issue the change was agreed on in, describe what changed
and why, and say which checks you ran.
