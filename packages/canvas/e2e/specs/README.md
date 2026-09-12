# E2E test layout

## Folder structure

Specs are grouped into one folder per area (the table below); the files in each folder are
the listing, so this README does not repeat them. `smoke.spec.ts` at the root holds the
cross-cutting startup and basic behavior checks. A helper shared by one folder's specs sits
next to them (e.g. `scenario/buildDiagram.ts`).

## How the classification works

| Folder      | Scope                                                                             | Examples                                                                |
| ----------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| root        | cross-cutting startup and basic behavior                                          | `smoke.spec.ts`                                                         |
| `shapes/`   | creating, transforming and connecting SVG shapes                                  | `draw.spec.ts`, `connector.spec.ts`, `basic-gestures.spec.ts`           |
| `editing/`  | editing the content inside shapes (text, connector labels)                        | `text-edit.spec.ts`, `connector-label.spec.ts`                          |
| `arrange/`  | stacking order, grouping and undo / redo history                                  | `z-order.spec.ts`, `group.spec.ts`, `history.spec.ts`                   |
| `keyboard/` | keyboard operations: selection, nudge, clipboard                                  | `selection.spec.ts`, `nudge.spec.ts`, `clipboard.spec.ts`               |
| `ui/`       | UI operations such as the toolbar, ObjectMenu, property panel and shape library   | `object-menu.spec.ts`, `property-panel.spec.ts`, `toolbar-zoom.spec.ts` |
| `api/`      | the imperative handle a host drives a mounted canvas through                      | `canvas-handle.spec.ts`                                                 |
| `driver/`   | self-tests of CanvasDriver's primitives (the driver API, not product behavior)    | `driver-input.spec.ts`                                                  |
| `scenario/` | user flows spanning several features, and invariants under a panned / zoomed view | `wireframe.spec.ts`, `screen-flow.spec.ts`, `pan.spec.ts`               |

Every folder but `scenario/` and `driver/` is a **feature-domain axis** (verifying a single
feature). `scenario/` is a **granularity axis** and verifies a sequence of user operations
spanning several features. Anything that is complete within a single feature goes into its
feature folder; cross-cutting flows such as building a diagram go into `scenario/` (a
different thing from the cross-cutting startup checks in `smoke.spec.ts`, since these
assemble a concrete deliverable). `driver/` tests the test driver itself, so a failure there
points at CanvasDriver rather than at the product.

The diagram-building scenarios (`wireframe.spec.ts`, `screen-flow.spec.ts`) add no new
primitives: they compose operations that CanvasDriver already provides and that are already
tested, using `buildDiagram.ts`, to assemble a deliverable. They exist to show that "if the
individual operations are green, their combination (a real usage scenario) assembles
automatically too".

## When to split a file

Once a single file exceeds 20–30 tests, split it by feature.
