# @jiscribe/standard-shapes

The shipped shape set as one package. Registering "the standard shapes" is
something every host does — the editors, the VSCode extension, the CLI's render
harness, the schema generator — and each one used to spell out the same nine
plugin imports. This is that list, once.

```ts
// A canvas: the plugins, plus the two declarations that reach their stencils
import {
	standardPlugins,
	standardStencilLibrarySections,
	standardToolbarSections,
} from "@jiscribe/standard-shapes";

// A parser, doc-ops or generator: no react, so it runs in Node
import { standardDocPlugins } from "@jiscribe/standard-shapes/doc";
```

| Export                           | Entry  | What it is                                                                                                        |
| -------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| `standardPlugins`                | `.`    | The nine plugins for `CanvasConfig.plugins`                                                                       |
| `standardToolbarSections`        | `.`    | The whole bar — the shape tools below, then core's history, view and properties sections — for `toolbar.sections` |
| `standardToolbarToolsSection`    | `.`    | Just the shape tools of that bar: the library toggle, then six pinned presets                                     |
| `standardStencilLibrarySections` | `.`    | The whole set as sidebar sections, for `stencilLibrary.sections`                                                  |
| `standardDocPlugins`             | `/doc` | The same nine, headless, for `createCanvasParser` / `createDocOps`                                                |
| `standardObjectDocDefinitions`   | `/doc` | Every type of the set by name, canvas built-ins included                                                          |

## The two entries

`./doc` mirrors the split `@jiscribe/canvas` makes: it reaches only each plugin's
own `./doc`, so importing it drags in no react and no DOM. A Node host — the CLI,
an MCP server, the extension's diagnostics — takes that one. The root entry is
the half a canvas is rendered with, and pulls the whole rendering layer.

## Registering both halves

A host has to give the same set to `<Canvas>` **and** to its parser, and neither
side complains when it does not. Register only with the canvas and the parser
strips every plugin object out of the document as an unknown type; register only
with the parser and the canvas has no definition to draw them with. Either way
the shapes go missing.

`standardPlugins` and `standardDocPlugins` are the same nine in the same order,
which is what makes the pair safe to use without checking.

## The bar and the library are one pair

`standardToolbarSections` pins six presets and nothing else; every other shape of
the set — the `markdown` preset and the eight plugin categories — is reachable
only through `standardStencilLibrarySections`, the sidebar the toolbar's shape
library toggle opens at its far left. A host passing the bar without the library ships a canvas
whose plugin shapes cannot be drawn by hand — and the toggle itself is dropped,
since it would open an empty sidebar. Pass both:

```tsx
<Canvas
	toolbar={{ sections: standardToolbarSections }}
	stencilLibrary={{ sections: standardStencilLibrarySections }}
/>
```

## Not the toolbar for everyone

Both arrays are the arrangement the editors settled on, not a rule. A host that
only wants its own UI on the bar takes `standardToolbarToolsSection` and orders
the sections itself — core's `DEFAULT_TOOLBAR_HISTORY_SECTION`,
`DEFAULT_TOOLBAR_VIEW_SECTION` and `DEFAULT_TOOLBAR_PROPERTIES_SECTION` are
exported one by one for exactly that, and the properties toggle is meant to stay
at the far right. A host wanting a different set of shapes copies them and
rebuilds from the plugins' own
`*StencilCategory` exports, which serve as a bar flyout and a sidebar section
alike — `apps/canvas-examples`'s plugins example does exactly that, on purpose,
to show what composing them by hand looks like.
