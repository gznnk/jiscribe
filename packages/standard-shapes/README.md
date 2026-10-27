# @jiscribe/standard-shapes

The shipped shape set as one package. Registering "the standard shapes" is
something every host does — the editors, the VSCode extension, the CLI's render
harness, the schema generator — and each one used to spell out the same ten
plugin imports. This is that list, once.

```ts
// A canvas: the plugins, plus the declarations that reach their stencils
import {
	standardBottomToolbarPresetIds,
	standardPlugins,
	standardStencilLibrarySections,
	standardToolbarSections,
} from "@jiscribe/standard-shapes";

// A parser, doc-ops or generator: no react, so it runs in Node
import { standardDocPlugins } from "@jiscribe/standard-shapes/doc";
```

| Export                           | Entry    | What it is                                                                                                                                     |
| -------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `standardPlugins`                | `.`      | The ten plugins for `CanvasConfig.plugins`                                                                                                     |
| `standardToolbarSections`        | `.`      | The whole top bar — core's history, view and help sections and the sidebar toggles, then the switch for both sidebars — for `toolbar.sections` |
| `standardBottomToolbarPresetIds` | `.`      | The six presets the bottom tool bar pins, for `bottomToolbar.presetIds`                                                                        |
| `standardToolbarToolsSection`    | `.`      | The shape tools the top bar used to carry (the library toggle, then the six presets), for a host keeping presets on top                        |
| `standardStencilLibrarySections` | `.`      | The whole set as sidebar sections, for `stencilLibrary.sections`                                                                               |
| `standardDocPlugins`             | `/doc`   | The same ten, headless, for `createCanvasParser` / `createDocOps`                                                                              |
| `standardObjectDocDefinitions`   | `/doc`   | Every type of the set by name, canvas built-ins included                                                                                       |
| `standardAiToolPlugins`          | `/tools` | The AI tools the set's plugins offer for their own shapes, for `createCanvasToolSet` (the table's and the record's, so far)                    |

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

## The bars and the library are one set

`standardBottomToolbarPresetIds` pins six presets on the bottom tool bar and
nothing else; every other shape of the set — the `markdown` and `table` presets
and the eight plugin categories — is reachable only through
`standardStencilLibrarySections`, the sidebar the switch at the far right of
`standardToolbarSections` opens (together with the properties sidebar), or the
library's own toggle beside it opens alone. A host
passing the bars without the library ships a canvas whose plugin shapes cannot
be drawn by hand, and the switch then opens the properties sidebar alone. Pass
all three:

```tsx
<Canvas
	toolbar={{ sections: standardToolbarSections }}
	bottomToolbar={{ presetIds: standardBottomToolbarPresetIds }}
	stencilLibrary={{ sections: standardStencilLibrarySections }}
/>
```

Inline object literals defeat `<Canvas>`'s memo; a real host hoists them to
module scope or `useMemo`s them.

## Not the toolbar for everyone

These are the arrangement the editors settled on, not a rule. A host that wants
its own UI on the top bar orders the sections itself — core's
`DEFAULT_TOOLBAR_HISTORY_SECTION`, `DEFAULT_TOOLBAR_VIEW_SECTION`,
`DEFAULT_TOOLBAR_HELP_SECTION`, `DEFAULT_TOOLBAR_PER_SIDEBAR_TOGGLES_SECTION`
and `DEFAULT_TOOLBAR_SIDEBARS_SECTION` are exported one by one for exactly that,
and the sidebars switch is meant to stay at the far right. While the sidebars
are closed the bar collapses into two corner pills; a host section that should
not show there sets `collapsedAlign: "hidden"`. A host that wants the presets
back on the top bar takes `standardToolbarToolsSection` and hides the bottom bar
(`bottomToolbar={{ show: false }}`), or every preset shows twice. A host wanting
a different set of shapes copies them and rebuilds from the plugins' own
`*StencilCategory` exports, which serve as a bar flyout and a sidebar section
alike — `apps/canvas-examples`'s plugins example does exactly that, on purpose,
to show what composing them by hand looks like.
