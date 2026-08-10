> 🌐 日本語版: [README.ja.md](./README.ja.md)

# Jiscribe

An SVG diagram canvas engine for React — the editing core behind
[jiscribe](https://beta.jiscribe.dev), extracted as a standalone library.

Jiscribe is document-first: a diagram is a plain JSON value (`.jis.json`) that
you own, and the canvas is a controlled React component that renders and edits
it. Shapes are not hardcoded into the core — flowchart, UML, sticky, markdown
and the rest all ship as plugins built on the same public API you would use for
your own.

> **Status: pre-release.** The packages are not on npm yet and the public API
> may still change. Follow the repository if you want to know when `0.1.0` is
> tagged.

## Quick look

```bash
pnpm install
pnpm dev:examples   # gallery of integration examples on http://localhost:5174/
```

The gallery in `apps/canvas-examples` is the fastest way to see what the engine
does: each example is a single self-contained file you can copy into your own
app.

## Using the canvas

```tsx
import { Canvas } from "@jiscribe/canvas";
import type { CanvasDoc } from "@jiscribe/canvas";

const doc: CanvasDoc = { version: 1, root: [] };

export function App() {
	return <Canvas doc={doc} />;
}
```

Shapes beyond the primitives come from plugins, registered per canvas:

```tsx
import { Canvas } from "@jiscribe/canvas";
import type { CanvasConfig } from "@jiscribe/canvas";
import { flowchartPlugin } from "@jiscribe/plugin-flowchart-shapes";
import { umlPlugin } from "@jiscribe/plugin-uml-shapes";

const config: CanvasConfig = { plugins: [flowchartPlugin, umlPlugin] };

export function App() {
	return <Canvas doc={doc} initialConfig={config} />;
}
```

`@jiscribe/canvas` also exposes a **headless document layer** (`@jiscribe/canvas/doc`)
that parses, validates and transforms `.jis.json` without pulling in React or
any DOM dependency — that is what the VSCode extension's diagnostics and the AI
tooling are built on.

## What is in this repository

| Package                      | What it is                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| `@jiscribe/canvas`           | The engine: rendering, gestures, commands, state, document schema                         |
| `@jiscribe/canvas-sdk`       | Shape-authoring kit for plugin authors, written against the canvas public API             |
| `@jiscribe/geometry`         | Geometry types and calculations (rects, ellipses, transforms, intersections)              |
| `@jiscribe/markdown`         | Markdown rendering used by the markdown shape                                             |
| `@jiscribe/basic-validators` | Primitive runtime validators                                                              |
| `@jiscribe/utility-types`    | Shared TypeScript utility types                                                           |
| `@jiscribe/ai-docs`          | Generated JSON Schema and AI-facing reference for the shipped shape set                   |
| `plugins/*`                  | The shipped shape sets — flowchart, UML, container, general, annotation, sticky, markdown |
| `apps/canvas-examples`       | Integration examples (one example = one file)                                             |
| `apps/vscode-extension`      | The Jiscribe VSCode extension                                                             |

The `plugins/` directory is deliberately treated as _external_: those packages
may only use the public API of `@jiscribe/canvas` and `@jiscribe/canvas-sdk`,
enforced by ESLint. If the shipped shapes can be written that way, so can yours.

## Development

```bash
pnpm install

pnpm dev:examples      # run the examples gallery
pnpm build:examples    # build the examples gallery
pnpm build:vscode      # build the VSCode extension

pnpm lint              # ESLint across the workspace
pnpm typecheck         # TypeScript across the workspace
pnpm dep:check         # circular dependency check (madge)
pnpm format            # Prettier
pnpm test              # unit tests (vitest)
pnpm test:e2e          # full Playwright e2e suite
```

Requirements: Node.js 22 (18+ works) and pnpm 10.

Design documentation for the engine lives in
[`packages/canvas/docs/`](./packages/canvas/docs/README.md) — 13 documents
covering the design philosophy, architecture, data model, gesture system,
command system, state update flow, external sync, theming, testing, style
properties, shape design, plugin architecture and plugin authoring. Japanese
versions are alongside as `*.ja.md`.

## Contributing

**Issues are welcome; pull requests are accepted by prior agreement only** — open
an issue first and wait for a reply saying the change is wanted. See
[CONTRIBUTING.md](./CONTRIBUTING.md#how-contributions-work) for why, and for
everything else you need to get a change merged.

Note that most in-code comments and some design documents are written in
Japanese; English is fine for issues and pull requests.

## License

[MIT](./LICENSE) © gznnk
