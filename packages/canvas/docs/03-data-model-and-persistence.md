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
Because CanvasMapper looks up the Mapper for each shape type from the `ObjectRegistry` and invokes it polymorphically,
it is the **one exception within `states/` that may reference `registry/`** (see
[Architecture](./02-architecture.md#registry-layer) for the reasoning). The structural
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

- `root` … A single array mixing shapes (rect / ellipse / diamond / polyline / polygon / group / sticky) and connectors. **The array order is itself the stacking order (z-order).**
- Connector (`type: "connector"`) … Each endpoint references its target shape via `source` / `target` using an `owner{type,id}` plus an `anchor`. Connectors are placed only directly under `root` and are never children of a group. At least one endpoint must be owned (a connector with both ends free is invalid).
- Color fields (`stroke` / `fontColor` / `fill`) … In addition to a concrete CSS color, they may take the sentinel value `"auto"` (follow the theme). `"auto"` is resolved to the theme's foreground color at render time (see [Presentation and Theme](./08-presentation-and-theme.md)). The default `stroke` / `fontColor` for a new shape is `"auto"`.
- For the full format specification, see `../ai/reference.md` and `../ai/jiscribe.schema.json`.

## The Parser's Two-Stage Validation (Defense at the Boundary)

For JSON strings coming from outside, `parseCanvasText` (`schemas/canvas/validators/`)
returns its result as a **discriminated union without throwing exceptions**. This lets the
extension side and the Webview side share the same logic and prevents errors from slipping through.

```ts
type CanvasParseResult =
	| { kind: "ok"; doc: CanvasDoc }
	| { kind: "syntax-error"; message: string } // JSON.parse failed
	| { kind: "semantic-error"; diagnostics: SemanticDiagnostic[] }
	| { kind: "internal-error"; message: string }; // unexpected exception during validation
```

Validation happens in two stages. If the structure does not hold, semantic validation is not reached.

1. **Structural validation `validateStructure`** — Validates each node's type and required fields.
   Type-specific validation is delegated to `objectDocValidatorRegistry`, and only the recursion into a
   `group`'s `children` is handled here as a structural rule.
2. **Semantic validation `validateSemantics`** — Validates consistency that can only be judged by
   traversing the entire document.
   - **Uniqueness of IDs**: IDs must not be duplicated across the root tree (including connectors).
     Because `CanvasDoc` is a nested tree, a "parent-child cycle" cannot occur structurally; any case that looks like a cycle is effectively "different objects sharing the same ID" — that is, nothing more than an ID duplication.
   - **Referential integrity of connectors**: an owner's `id` must exist, and the referenced target must be of a connectable type (group / polyline / polygon / connector are not allowed). A self-loop where source and target point to the same object is permitted and is drawn as a rectangular loop via a dedicated orthogonal route (see `resolveConnectorPoints` / `routeSelfLoop`).

The `objectDocValidatorRegistry` used for validation is needed only at parse time, so `parseCanvasText`
initializes it idempotently if it is uninitialized. This structurally lets callers avoid false positives caused by picking the wrong entry point.

### A Parser-Only Entry Point

`parser.ts` is a separate entry point that includes no UI dependencies (react / emotion / katex).
It is aimed at consumers who "just want to parse text into a `CanvasDoc`" (such as the DiagnosticProvider on the Node side of the VSCode extension).

```ts
import { parseCanvasText } from "@workspace/canvas/parser";
```

Assuming that any Doc that has passed this boundary is valid, internal functions omit defensive checks
(principle 4 of the [Design Philosophy](./01-design-philosophy.md)). For validation at the entry point of external sync, see
[External Sync / VSCode Integration](./07-external-sync.md).
