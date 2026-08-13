> 🌐 日本語版: [03-data-model-and-persistence.ja.md](./03-data-model-and-persistence.ja.md)

# Data Model and Persistence

canvas holds data in two forms: **Doc** (for persistence; a tree) and
**State** (for runtime use; flat), with a Mapper converting between them.
This separation follows the "performance first" and "defense at the boundary" principles of the [Design Philosophy](./01-design-philosophy.md).

## Doc and State

|         | Doc (schemas/)                             | State (states/)                             |
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
├── RectState.ts      # State type
├── RectMapper.ts     # Doc ↔ State
└── __tests__/
```

The overall conversion is managed centrally by `states/canvas/CanvasMapper.ts` (`canvasToState` / `canvasToDoc`).
Because CanvasMapper looks up each shape type's Mapper from `objectMapperRegistry` (`states/registry/ObjectMapperRegistry`) and
invokes it polymorphically, it is the one point that consults a registry to convert the whole document — but that registry lives
**within the `states/` layer itself** (colocated with the mappers it serves), so this is not a cross-layer dependency (see
[Architecture](./02-architecture.md) for the reasoning). The structural
conversion between tree and flat (expanding and reconstructing parent-child relationships)
is concentrated at this single point and never leaks into the individual Mappers.

## Persistence Format (`.jis.json` / `CanvasDoc`)

The saved format is `CanvasDoc` (`schemas/canvas/CanvasDoc.ts`).

```jsonc
{
	"$schema": "https://schema.jiscribe.dev/v1/jiscribe.schema.json",
	"version": 1,
	"root": [
		/* An array mixing ObjectDocs and connectors in z-order (back to front).
		   A group nests its children. Connectors are never children of a group and
		   live only directly under root. */
	],
}
```

- `root` … A single array mixing shapes (rect / ellipse / diamond / polyline / polygon / group / sticky / svg) and connectors. **The array order is itself the stacking order (z-order).**
- Connector (`type: "connector"`) … Each endpoint references its target shape via `source` / `target` using an `owner{type,id}` plus an `anchor`. Connectors are placed only directly under `root` and are never children of a group. At least one endpoint must be owned (a connector with both ends free is invalid).
- Color fields (`stroke` / `fontColor` / `fill`) … In addition to a concrete CSS color, they may take the sentinel value `"auto"` (follow the theme). `"auto"` is resolved to the theme's foreground color at render time (see [Presentation and Theme](./08-presentation-and-theme.md)). The default `stroke` / `fontColor` for a new shape is `"auto"`.
- For the full format specification, see `../../ai-docs/assets/reference.md` and `../../ai-docs/assets/jiscribe.schema.json`.

### Text Model Asymmetry (a shape's `text` vs. a connector's `label`)

The storage shape of the text-bearing fields is **intentionally asymmetric** between shapes and connectors.

- **Single-body shapes (rect / ellipse / diamond / sticky, …)** … hold `text` / `textAlign` / `fontColor` … **flat at the top level** (`features.text: "body"` composes `TextStyleDoc`).
- **Multi-slot shapes (e.g. the uml-shapes record)** … declare `features.text: "slots"` and hold `text` as an **object keyed by slot id** (`text: { name: {…}, rows: {…} }`; each slot is a `TextSlot` = content plus typography, and the slot set is closed per type).
- **Connectors** … hold their annotation as a **single nested object**
  `label: { text, position, offset, fontColor, fontSize, fontWeight, fill, stroke, strokeWidth, strokeDashType }`
  (no `features.text`). The background `fill` and border `stroke` / `strokeWidth` / `strokeDashType` borrow the same vocabulary as shapes, but differ in that they are nested inside `label`.

On the State side both shape forms normalize to the **one keyed-slot form** (a `"body"` type's mapper expands it into the single `body` slot and folds it back on save; see `TextSlotsMapper`). The rendering / editing / styling consumers read only this normal form and never branch on the doc's shape.

This difference does not reflect layer convenience but a **difference in role**. A shape's `text` is "the _body_ of that shape" (central, essentially the main actor, with in-box alignment). A connector's text is "an _annotation_ attached to an edge (edge label)" (optional, secondary, with no notion of alignment), and it additionally has **connector-specific placement axes**: `position` (a ratio along the route) and `offset` (perpendicular distance). Reusing a flat form would introduce distortions: (1) these connector-specific fields would mix in with the other keys and their ownership would become unreadable; (2) a short tag on a line would carry irrelevant `textAlign` / `verticalAlign`. The judgment is that **different things may take different shapes** (forcing them to match would be "false consistency"). Even from the perspective of the AI that generates the JSON, this is consistent with the premise that each type has different capabilities (the capability table in `../../ai-docs/assets/ai-guide.md`), so the cost of confusion is low.

Guidance for when this asymmetry bothers you:

- **The fix is to "raise," not "lower."** If you want symmetry, the right approach is not to flatten the connector (which revives the distortions above: specific fields floating loose, irrelevant fields attached), but to **align shapes to the `label` nesting as well**. Since the policy is that backward compatibility is unnecessary (we are the only users), this is technically feasible.
- **But do not do it until a second reason appears.** When that second motivation — a shape needing multiple text regions — actually arrived with #167, the answer taken was not unifying on `label` nesting but **named text slots** (State always keyed, the single-body doc keeping its flat sugar). Folding the connector `label` into a slot (removing the type-specific branch) remains an optional follow-up for when more motivation accumulates.
- **Perfect symmetry is inherently unattainable.** Even if everything were nested, the key names would still **differ in meaning** — shape = body (`text`), connector = annotation (`label`) — so some asymmetry conceptually remains no matter what.

**Nesting support in the styling UI (dot notation)**: The styling property-update plumbing
(menu item → `MENU_PROPERTY_UPDATE` / `object-menu:set:` → `StylePropertyRegistry.apply`) carries
flat property names. Because the label's background and border (`label.fill` / `label.stroke` /
`label.strokeWidth`) are nested, they **ride on this plumbing as-is using dot-notation property names**.
Both routes converge at the single point `StylePropertyRegistry.apply`; the `label.*` names are declared
as connector-specific style properties (`ConnectorExtraStyleProperties`), and the shared write path
interprets the dots as a nested merge into `connector.label` (a no-op while the label is unset). This is
a pragmatic compromise to reuse the shared UI (`ColorPickerGrid` / `MenuSlider`) and the `commit`
subtleties (live preview + a single history entry) without reimplementing them. Adding a dedicated
action is rejected because it would duplicate these commit subtleties.

## The Parser's Two-Stage Validation (Defense at the Boundary)

For JSON strings coming from outside, a parser from `createCanvasParser` (`schemas/canvas/validators/`)
returns its result as a **discriminated union without throwing exceptions**. This lets the
extension side and the Webview side share the same logic and prevents errors from slipping through.

```ts
type CanvasParseResult =
	| { kind: "ok"; doc: CanvasDoc }
	| { kind: "syntax-error"; message: string } // JSON.parse failed
	| { kind: "structure-error"; diagnostics: SemanticDiagnostic[] } // validateStructure failed
	| { kind: "semantic-error"; diagnostics: SemanticDiagnostic[] } // validateSemantics failed
	| { kind: "internal-error"; message: string }; // unexpected exception during validation
```

`structure-error` and `semantic-error` correspond to the two validation stages below, so
each stage's failure surfaces as a distinct variant.

Validation happens in two stages. If the structure does not hold, semantic validation is not reached.

1. **Structural validation `validateStructure`** — Validates each node's type and required fields.
   Type-specific validation is delegated to `objectDocValidatorRegistry`, and only the recursion into a
   `group`'s `children` is handled here as a structural rule.
2. **Semantic validation `validateSemantics`** — Validates consistency that can only be judged by
   traversing the entire document.
   - **Uniqueness of IDs**: IDs must not be duplicated across the root tree (including connectors).
     Because `CanvasDoc` is a nested tree, a "parent-child cycle" cannot occur structurally; any case that looks like a cycle is effectively "different objects sharing the same ID" — that is, nothing more than an ID duplication.
   - **Referential integrity of connectors**: an owner's `id` must exist, and the referenced target must be of a connectable type (group / polyline / polygon / connector are not allowed). A self-loop where source and target point to the same object is permitted and, while its `points` are empty, is drawn as a rectangular loop via a dedicated orthogonal route (see `resolveConnectorPoints` / `routeSelfLoop`); vertices replace that fixed ring with the authored path.

The doc-validator registry used for validation is needed only at parse time, so each parser builds its
own from the definition set it is given. Nothing global is mutated, so two parsers with different plugin
sets can coexist in one process.

### A Parser-Only Entry Point

`doc.ts` is a separate headless entry point that includes no UI dependencies (react / emotion / katex).
It is aimed at consumers who "just want to parse text into a `CanvasDoc`" or build one programmatically (such as the DiagnosticProvider on the Node side of the VSCode extension, or the MCP server).

```ts
import { createCanvasParser } from "@jiscribe/canvas/doc";
```

Assuming that any Doc that has passed this boundary is valid, internal functions omit defensive checks
(principle 4 of the [Design Philosophy](./01-design-philosophy.md)). For validation at the entry point of external sync, see
[External Sync / VSCode Integration](./07-external-sync.md).
