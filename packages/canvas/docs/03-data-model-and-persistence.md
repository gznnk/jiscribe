> 🌐 日本語版: [03-data-model-and-persistence.ja.md](./03-data-model-and-persistence.ja.md)

# Data Model and Persistence

canvas holds data in two forms: **Doc** (for persistence; a tree) and
**State** (for runtime use; flat), with a Mapper converting between them.
This separation follows the "performance first" and "defense at the boundary" principles of the [Design Philosophy](./01-design-philosophy.md).

## Doc and State

|         | Doc (`@jiscribe/doc`)                      | State (`states/`)                           |
| ------- | ------------------------------------------ | ------------------------------------------- |
| Purpose | Persistence / file I/O                     | Runtime editing                             |
| Form    | Tree (`GroupDoc.children` nests its child) | Flat (`objects` is a `Record` keyed by ID)  |
| Example | `RectDoc`, `GroupDoc`, `ConnectorDoc`      | `RectState`, `GroupState`, `ConnectorState` |

A tree is easy for both humans and file diffs to read, but poorly suited to
lookups and updates during editing. So at runtime we normalize it into a flat
form that allows O(1) access by ID.

## Conversion via Mappers

State and Mapper are colocated per shape (the "colocation" of the [Architecture](./02-architecture.md)).
Each Mapper converts **only its own properties** and does not recurse into child elements.

```
states/objects/primitives/rect/
├── RectState.ts         # State type
├── RectMapper.ts        # Doc ↔ State
├── validateRectState.ts # State validator
└── __tests__/
```

The overall conversion is managed centrally by `states/canvas/CanvasMapper.ts` (`canvasToState` / `canvasToDoc`).
CanvasMapper looks up each shape type's Mapper from the `ObjectMapperRegistry` it receives as an argument
(`states/registry/`; in practice the per-canvas registry bundle's `registries.objectMapper`) and invokes it
polymorphically. `canvasToState` also receives an `ObjectContentResizerRegistry`, for the types whose box is
re-derived from their content. The registries are passed one by one rather than as the bundle because both are
**`states/`-layer registries** (colocated with the mappers they serve), so the conversion does not depend on the
controller-layer bundle (see [Architecture](./02-architecture.md) for the reasoning). The structural
conversion between tree and flat (expanding and reconstructing parent-child relationships)
is concentrated at this single point and never leaks into the individual Mappers.

## Persistence Format (`.jis` / `CanvasDoc`)

The saved format is `CanvasDoc` (`@jiscribe/doc`, `model/canvas/CanvasDoc.ts`).

```jsonc
{
	"version": 1,
	"root": [
		/* An array mixing ObjectDocs and connectors in z-order (back to front).
		   A group nests its children. Connectors are never children of a group and
		   live only directly under root. */
	],
}
```

- `root` … A single array mixing shapes and connectors. A shape may be of any registered type (the built-in types are in `@jiscribe/doc`'s `plugin/builtinObjectDocDefinitions.ts`; plugins add the rest). **The array order is itself the stacking order (z-order).**
- Besides `version` and `root`, the top level has optional fields (such as the canvas surface color `background`); `CanvasDoc.ts` is the source of truth.
- `$schema` … Never produced. An existing `.jis` carrying one still parses, but `canvasToDoc` drops it on save (so the line disappearing when you edit such a file is intended).
- Connector (`type: "connector"`) … Each endpoint references its target shape via `source` / `target` using an `owner{type,id}` plus an `anchor`. Connectors are placed only directly under `root` and are never children of a group. At least one endpoint must be owned (a connector with both ends free is invalid).
- Color fields (`stroke` / `fontColor` / `fill`) … In addition to a concrete CSS color, they may take the sentinel value `"auto"` (follow the theme). `"auto"` is resolved to the theme's foreground color at render time (see [Rendering and Theme](./08-rendering-and-theme.md)). The default `stroke` / `fontColor` for a new shape is `"auto"`.
- Numeric fields (coordinates / sizes / rotation) … Rounded to `PRECISION` **where the State turns into a Doc**, not where a gesture or command computes them. The Doc's geometry is derived from the State's (`x = cx - width / 2`), so rounding upstream does not survive the derivation; fixing the precision at the one boundary also covers the paths that round nothing of their own (group transforms, plugin controls, `createDocOps`). The rounding functions live in `@jiscribe/doc`'s `model/objects/utils/roundDocNumbers.ts`.
- For the full format specification, see `../../doc-schema/assets/jiscribe.schema.json`; `../../doc-schema/assets/ai-guide.md` is the prose introduction to it.

### Text Model Asymmetry (a shape's `text` vs. a connector's `label`)

The storage shape of the text-bearing fields is **intentionally asymmetric** between shapes and connectors.

- **Single-body shapes (rect / ellipse / diamond / sticky, …)** … hold `text` / `textAlign` / `fontColor` … **flat at the top level** (`features.text: "body"` composes `TextStyleDoc`).
- **Multi-slot shapes (e.g. the uml-shapes record)** … declare `features.text: "slots"` and hold `text` as an **object keyed by slot id** (`text: { name: {…}, rows: {…} }`; each slot is a `TextSlot` = content plus typography, and the slot set is closed per type).
- **Connectors** … hold their annotation as a **single nested object** `label` (no `features.text`).
  It carries the body `text`, its placement along the route (`position` / `offset`), text styling, and a background and border;
  the type's source of truth is `ConnectorLabel` in `@jiscribe/doc`'s `ConnectorDoc.ts`. The background `fill` and border `stroke` etc. borrow the same vocabulary as shapes, but differ in that they are nested inside `label`.

On the State side both shape forms normalize to the **one keyed-slot form** (a `"body"` type's mapper expands it into the single `body` slot and folds it back on save; see `TextSlotsMapper`). The rendering / editing / styling consumers read only this normal form and never branch on the doc's shape.

This difference does not reflect layer convenience but a **difference in role**. A shape's `text` is "the _body_ of that shape" (central, essentially the main actor, with in-box alignment). A connector's text is "an _annotation_ attached to an edge (edge label)" (optional, secondary, with no notion of alignment), and it additionally has **connector-specific placement axes**: `position` (a ratio along the route) and `offset` (perpendicular distance). Reusing a flat form would introduce distortions: (1) these connector-specific fields would mix in with the other keys and their ownership would become unreadable; (2) a short tag on a line would carry irrelevant `textAlign` / `verticalAlign`. The judgment is that **different things may take different shapes** (forcing them to match would be "false consistency"). Even from the perspective of the AI that generates the JSON, this is consistent with the premise that each type carries different things (`../../doc-schema/assets/ai-guide.md` describes them type by type in "Object quick reference" and "Geometry by type"), so the cost of confusion is low.

Guidance for when this asymmetry bothers you:

- **The fix is to "raise," not "lower."** If you want symmetry, the right approach is not to flatten the connector (which revives the distortions above: specific fields floating loose, irrelevant fields attached), but to **align shapes to the `label` nesting as well**. Since the policy is that backward compatibility is unnecessary (we are the only users), this is technically feasible.
- **But do not do it until a second reason appears.** When that second motivation — a shape needing multiple text regions — actually arrived with #167, the answer taken was not unifying on `label` nesting but **named text slots** (State always keyed, the single-body doc keeping its flat sugar). Folding the connector `label` into a slot (removing the type-specific branch) remains an optional follow-up for when more motivation accumulates.
- **Perfect symmetry is inherently unattainable.** Even if everything were nested, the key names would still **differ in meaning** — shape = body (`text`), connector = annotation (`label`) — so some asymmetry conceptually remains no matter what.

**Nesting support in the styling UI (dot notation)**: The styling property-update plumbing
(menu item → `STYLE_PROPERTY_UPDATE` or the ObjectMenu gesture `set:{property}:{value}` → `StylePropertyRegistry.apply`) carries
flat property names. Because the label's styling (`label.fill` / `label.stroke` / `label.fontColor`, …) is nested,
it **rides on this plumbing as-is using dot-notation property names**.
Both routes converge at the single point `StylePropertyRegistry.apply`; the `label.*` names are declared
as connector-specific style properties (`ConnectorExtraStyleProperties`), and the shared write path
interprets the dots as a nested merge into `connector.label` (a no-op while the label is unset). This is
a pragmatic compromise to reuse the shared UI (`ObjectMenuColorPickerGrid` / `ObjectMenuSlider`) and the `commit`
subtleties (live preview + a single history entry) without reimplementing them. Adding a dedicated
action is rejected because it would duplicate these commit subtleties. What the style registry does not own takes a
sibling action instead: the frame's own numbers (position / size / rotation) take `TRANSFORM_PROPERTY_UPDATE`, the
document's own settings (such as the canvas surface `background`) take `DOCUMENT_PROPERTY_UPDATE`, and an object's
`meta` takes `META_PROPERTY_UPDATE`. None of them keeps a second copy of the commit subtleties; they share the commit tail
(`commitPropertyUpdate` in `controllers/reducer/canvasReducer.ts`). `DOCUMENT_PROPERTY_UPDATE` differs in that its target
is the doc rather than a selection, and `null` clears the field the way the headless `setBackground` op does, handing the surface back to the theme.

## The Parser's Two-Stage Validation (Defense at the Boundary)

For JSON strings coming from outside, a parser from `createCanvasParser` (`@jiscribe/doc`, `parse/`)
returns its result as a **discriminated union without throwing exceptions** (`CanvasParseResult`, defined in
`parse/parseWithRegistry.ts`). This lets the extension side and the Webview side share the same logic and
prevents errors from slipping through.

Each failure surfaces as its own `kind` (a JSON syntax error, a structure error, a semantic error, or an unexpected
exception during validation). Success (`ok`) carries, besides the doc, `warnings` reporting what was removed.

Validation happens in two stages, preceded by a step that removes unknown content. If the structure does not hold,
semantic validation is not reached.

1. **Removing unknown content `stripUnknownContent`** — Removes objects of unregistered types (cascading to groups
   left empty and connectors pointing at removed shapes) and unknown values of enum fields. These are not errors:
   they are reported as the `ok` result's `warnings` and the rest of the document still loads. `ok.doc` is the
   stripped doc, so saving it is what makes the removal stick.
2. **Structural validation `validateStructure`** — Validates each node's type and required fields.
   Type-specific validation is delegated to the doc-validator registry the parser built, and only the recursion into a
   `group`'s `children` is handled here as a structural rule.
3. **Semantic validation `validateSemantics`** — Validates consistency that can only be judged by
   traversing the entire document.
   - **Uniqueness of IDs**: IDs must not be duplicated across the root tree (including connectors).
     Because `CanvasDoc` is a nested tree, a "parent-child cycle" cannot occur structurally; any case that looks like a cycle is effectively "different objects sharing the same ID" — that is, nothing more than an ID duplication.
   - **Referential integrity of connectors**: an owner's `id` must exist, and the referenced target must be of a connectable type (decided by the type's `features.connectable`; e.g. group and connector are not).
   - **Self-loop ends**: a self-loop, where source and target point to the same object, is permitted, but a `center` anchor on either end is a semantic error (both ends must be pinned to a connectPoint). While its `points` are empty, a self-loop is drawn as a rectangular loop via a dedicated orthogonal route; vertices replace that fixed ring with the authored path (see `resolveConnectorPoints` / `routeSelfLoop`).

The doc-validator registry used for validation is needed only at parse time, so each parser builds its
own from the definition set it is given. Nothing global is mutated, so two parsers with different plugin
sets can coexist in one process.

### A Headless Package

The whole document layer is a separate package, `@jiscribe/doc`, which includes no UI dependencies (react / emotion / katex).
It is aimed at consumers who "just want to parse text into a `CanvasDoc`" or build one programmatically (such as the DiagnosticProvider on the Node side of the VSCode extension, or the MCP server).

```ts
import { createCanvasParser } from "@jiscribe/doc";
```

Assuming that any Doc that has passed this boundary is valid, internal functions omit defensive checks
(principle 4 of the [Design Philosophy](./01-design-philosophy.md)). For validation at the entry point of external sync, see
[External Sync / VSCode Integration](./07-external-sync.md).
