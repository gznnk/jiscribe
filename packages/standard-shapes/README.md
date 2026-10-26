# @jiscribe/standard-shapes

The shipped shape set as one package. Registering "the standard shapes" is
something every host does — the editors, the VSCode extension, the CLI's render
harness, the schema generator — and each one used to spell out the same ten
plugin imports. This is that list, once.

```ts
// A canvas: the plugins, plus the declarations that reach their stencils
import {
	standardDefaultPinnedCategoryIds,
	standardPlugins,
	standardRailPresetIds,
	standardStencilLibrarySections,
} from "@jiscribe/standard-shapes";

// A parser, doc-ops or generator: no react, so it runs in Node
import { standardDocPlugins } from "@jiscribe/standard-shapes/doc";
```

| Export                             | Entry    | What it is                                                                                                                    |
| ---------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `standardPlugins`                  | `.`      | The ten plugins for `CanvasConfig.plugins`                                                                                    |
| `standardRailPresetIds`            | `.`      | The six presets on the rail — core's primitives, then `sticky` — for `rail.presetIds`                                         |
| `standardStencilLibrarySections`   | `.`      | The whole set as library sections, for `stencilLibrary.sections`                                                              |
| `standardDefaultPinnedCategoryIds` | `.`      | The categories to pin when the host has no pins stored (flowchart, general, container), for `initialConfig.pinnedCategoryIds` |
| `standardToolbarSections`          | `.`      | The bar — core's history, view and properties sections — for `toolbar.sections`                                               |
| `standardDocPlugins`               | `/doc`   | The same ten, headless, for `createCanvasParser` / `createDocOps`                                                             |
| `standardObjectDocDefinitions`     | `/doc`   | Every type of the set by name, canvas built-ins included                                                                      |
| `standardAiToolPlugins`            | `/tools` | The AI tools the set's plugins offer for their own shapes, for `createCanvasToolSet` (the table's and the record's, so far)   |

## The entries

`./doc` mirrors the split `@jiscribe/canvas` makes: it reaches only each plugin's
own `./doc`, so importing it drags in no react and no DOM. A Node host — the CLI,
an MCP server, the extension's diagnostics — takes that one. The root entry is
the half a canvas is rendered with, and pulls the whole rendering layer.
`./tools` is headless the same way, reaching each plugin's own `./tools`.

## Registering both halves

A host has to give the same set to `<Canvas>` **and** to its parser, and neither
side complains when it does not. Register only with the canvas and the parser
keeps every plugin object as an unknown type it never validates; register only
with the parser and the canvas has no definition to draw them with, so it holds
them unread. Either way the file keeps them, but in the second case the shapes
go missing from the screen.

`standardPlugins` and `standardDocPlugins` are the same ten in the same order,
which is what makes the pair safe to use without checking.

## The rail and the library are one pair

`standardRailPresetIds` puts six presets on the rail and nothing else; every
other shape of the set — the `markdown` and `table` presets and the plugin
categories — is reachable only through `standardStencilLibrarySections`: the
categories pinned on the rail and the catalog its bottom button opens. A host
passing the presets without the library ships a canvas whose plugin shapes
cannot be drawn by hand — and the catalog button itself is not drawn, since it
would open an empty list. Pass both:

```tsx
<Canvas
	rail={{ presetIds: standardRailPresetIds }}
	stencilLibrary={{ sections: standardStencilLibrarySections }}
	initialConfig={{
		plugins: standardPlugins,
		pinnedCategoryIds: storedPins ?? standardDefaultPinnedCategoryIds,
	}}
	onPinnedCategoriesChange={storePins}
/>
```

The pins are the user's: the canvas pins nothing on its own, and reports every
change through `onPinnedCategoriesChange`. `standardDefaultPinnedCategoryIds` is
what to start from when nothing is stored yet; once the user has pinned or
unpinned, hand back what was reported instead.

## Not the arrangement for everyone

The arrays are the arrangement the editors settled on, not a rule. A host
wanting its own UI on the bar orders the sections itself — core's
`DEFAULT_TOOLBAR_HISTORY_SECTION`, `DEFAULT_TOOLBAR_VIEW_SECTION` and
`DEFAULT_TOOLBAR_PROPERTIES_SECTION` are exported one by one for exactly that,
and the properties toggle is meant to stay at the far right. A host wanting a
different set of shapes copies them and rebuilds from the plugins' own
`*StencilCategory` exports, each one a section of the library —
`apps/canvas-examples`'s plugins example does exactly that, on purpose, to show
what composing them by hand looks like.
