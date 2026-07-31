# E2E test layout

## Folder structure

```
specs/
├── README.md          # this file
├── smoke.spec.ts      # cross-cutting startup and basic behavior tests
├── shapes/            # drawing and manipulating shapes
│   ├── draw.spec.ts       # drawing Rectangle / Ellipse / Polyline and so on
│   └── connector.spec.ts  # connecting shapes by dragging an anchor
├── editing/           # content editing
│   └── text-edit.spec.ts  # typing, committing and cancelling text
├── ui/                # UI panel and toolbar operations
│   └── object-menu.spec.ts # styling through the ObjectMenu
└── scenario/          # end-to-end user flows spanning several features
    ├── buildDiagram.ts        # a "diagram-building DSL" composed of existing operations
    ├── wireframe.spec.ts      # a wireframe of a login screen
    └── screen-flow.spec.ts    # a screen transition diagram
```

> The demo for generating marketing material (reproducing hero-showcase.jis.json)
> is not a regression test, so it lives outside `specs/` (in `e2e/demo/`). See
> `e2e/README.md` for details.

## How the classification works

| Folder      | Scope                                            | Examples of tests to add                                                               |
| ----------- | ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| root        | cross-cutting startup and basic behavior         | —                                                                                      |
| `shapes/`   | creating, transforming and connecting SVG shapes | `transform.spec.ts` (move, resize, rotate), `group.spec.ts` (grouping), `path.spec.ts` |
| `editing/`  | editing the content inside shapes                | `copy-paste.spec.ts`, `undo-redo.spec.ts`                                              |
| `ui/`       | UI operations such as the toolbar and panels     | `toolbar.spec.ts`, `keyboard-shortcuts.spec.ts`                                        |
| `scenario/` | E2E user flows spanning several features         | `wireframe.spec.ts`, `screen-flow.spec.ts`, `copy-paste-flow.spec.ts`                  |

`shapes/` `editing/` `ui/` are **feature-domain axes** (verifying a single feature).
`scenario/` is a **granularity axis** and verifies a sequence of user operations spanning
several features. Anything that is complete within a single feature goes into its feature
folder; cross-cutting flows such as building a diagram go into `scenario/` (a different
thing from the cross-cutting startup checks in `smoke.spec.ts`, since these assemble a
concrete deliverable).

`scenario/` tests add no new primitives: they compose operations that CanvasDriver already
provides and that are already tested, using `buildDiagram.ts`, to assemble a deliverable.
They exist to show that "if the individual operations are green, their combination (a real
usage scenario) assembles automatically too".

## When to split a file

Once a single file exceeds 20–30 tests, split it by feature.
