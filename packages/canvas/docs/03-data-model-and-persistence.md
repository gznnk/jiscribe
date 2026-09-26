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

### An `image` names a file; the canvas never reads one

`image` stores `src`, a path relative to the directory the `.jis` lives in and
inside it (`/` separators, no `..`, no absolute path, no URL). The bytes are not
in the document, and `width` / `height` are required, so the layout of a document
holds up wherever its files cannot be reached.

Reading the file is the host's, through the `resolveImage` prop on `<Canvas>`:
it is handed the `src` untouched and answers with a `Blob`,
the way `onOpenReference` is handed a `meta.reference`. The canvas neither
resolves nor validates the path — the one reading of it every host shares is
`splitDocRelativePath` (`@jiscribe/doc`). Omit the prop, reject the promise, or
have no `<Canvas>` around the tree at all, and the shape draws a placeholder
rather than nothing; an image never silently disappears from the drawing.

What arrives is kept per `src` (`useDocImages`) as a blob URL the live `<image>`
draws from, plus the same bytes as a `data:` URI, which is what an export writes:
`.jis.svg` and PNG both inline the bytes, since a blob URL names nothing outside
the tab it was made in. An image whose file never arrived is dropped from the
exported file — it is the placeholder's own drawing that a viewer of a diagram
gets, never a dead reference.

### Text Model Asymmetry (a shape's `text` vs. a connector's `label`)

The storage shape of the text-bearing fields is **intentionally asymmetric** between shapes and connectors.

- **Single-body shapes (rect / ellipse / diamond / sticky, …)** … hold `text` / `textAlign` / `fontColor` … **flat at the top level** (`features.text: "body"` composes `TextStyleDoc`).
- **Source-language shapes** … declare `features.text: "source"` and hold the same flat group, narrowed to what such a body can carry (`SourceTextStyleDoc`): `text` is a plain string, never the run form, and the emphasis typography (`fontWeight` / `fontStyle` / `textDecoration`) is absent, the shape's own syntax being what sets it. `textStyleKeysOf` is the single answer on which fields a text type accepts, and `isSingleBodyText` on whether it is one of the two root forms.
- **Multi-slot shapes (e.g. the uml-shapes record)** … declare `features.text: "slots"` and hold `text` as an **object keyed by slot id** (`text: { name: {…}, rows: {…} }`; each slot is a `TextSlot` = content plus typography, and the slot set is closed per type).
- **Connectors** … hold their annotation as a **single nested object** `label` (no `features.text`).
  It carries the body `text`, its placement along the route (`position` / `offset`), text styling, and a background and border;
  the type's source of truth is `ConnectorLabel` in `@jiscribe/doc`'s `ConnectorDoc.ts`. The background `fill` and border `stroke` etc. borrow the same vocabulary as shapes, but differ in that they are nested inside `label`.

On the State side every shape form normalizes to the **one keyed-slot form** (a root-form type's mapper expands it into the single `body` slot and folds it back on save; see `TextSlotsMapper`, which moves only the fields the text type accepts, so a `"source"` slot never gains the emphasis fields and its content is written back as a plain string). The rendering / editing / styling consumers read only this normal form and never branch on the doc's shape.

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
`parse/createCanvasParser.ts`). This lets the extension side and the Webview side share the same logic and
prevents errors from slipping through.

Each failure surfaces as its own `kind` (a JSON syntax error, a structure error, a semantic error, or an unexpected
exception during validation). Success (`ok`) carries, besides the doc, `warnings` reporting what was removed or kept unread.

Validation happens in two stages, preceded by a step that rewrites the forms the format no longer writes and one
that removes unknown content. If the structure does not hold,
semantic validation is not reached. What each stage of one document's passage looks at, and what it does about
what it finds:

| Stage                                                                                  | What it looks at                                                                                                                                                                                                                                           | Result                                                                                                                |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `migrateDoc`                                                                           | The old forms the format once wrote: a source body written as styled runs, an empty list of runs                                                                                                                                                           | Rewritten into the current form — a warning either way                                                                |
| `stripUnknownContent`                                                                  | Enum fields holding a string outside the known set, in objects and in `view` (`open` / `scroll`); objects of unregistered types; connectors anchored to an unknown kind                                                                                    | Value removed; object kept opaque, or removed when it has no id (cascading); connector removed — a warning either way |
| `checkStructure`                                                                       | The document's own frame: `version`, the legacy top-level `connectors`, `$schema`, `background`, `view`, each `root` entry's `id` / `type` / `meta`, a group's `children`; every name the frame does not hold at the root, in `view` and in `view.padding` | Error; warning carrying `unknownKeyPath` for an unknown name                                                          |
| `registry.validate` (the type's `validateDoc`)                                         | The values the type's own fields hold                                                                                                                                                                                                                      | Error                                                                                                                 |
| `validateDocKeys` (against the names the registry built from `features` + `extraKeys`) | Every field name the type does not hold, on the object and inside the containers doc owns (text runs and slots, poly vertices, a connector's endpoints, anchors and label); a slot id the key order would not survive                                      | Warning carrying `unknownKeyPath` for an unknown name; error for an integer-like slot id                              |
| `checkSemantics`                                                                       | What only the whole document answers: id uniqueness, a connector's endpoints, a self-loop's anchors                                                                                                                                                        | Error                                                                                                                 |
| Unknown-key removal                                                                    | The positions those warnings carry                                                                                                                                                                                                                         | The field is deleted from `ok.doc`, so the next save drops it                                                         |

The removal runs last and only once both error gates have passed: a document that will not open has nothing to save.

1. **Migrating an old form `migrateDoc`** — Rewrites a field written in a form the format no longer writes: a
   `"source"` body written as styled runs (read as its plain text), and an empty list of runs (read as the empty
   text, which is an absent field for a body and `""` for one row of a slot). It runs on every parse with no
   version gate — the format has no generation to key on, so each migration recognizes the old form by its shape
   alone and is a no-op otherwise, which is what makes migrating a migrated document change nothing. Every rewrite
   is reported in `warnings`, and `ok.doc` is the migrated doc, so the next save is where the current form is
   written. An object of an unregistered type is never touched. The discipline a new migration follows is in
   `packages/doc/README.md`.
2. **Removing unknown content `stripUnknownContent`** — Removes unknown values of enum fields: a string outside the
   known set, which is what a document written for a newer build holds. A value of another type (`textAlign: 1`) is
   corruption and is left for the validator to reject. The same holds for the document-root `view`'s `open` and
   `scroll`. A connector whose endpoint anchors to a kind outside the known set is removed whole, since an anchor
   cannot be dropped on its own. The removals are not errors:
   they are reported as the `ok` result's `warnings` and the rest of the document still loads. `ok.doc` is the
   stripped doc, so saving it is what makes the removal stick. An object of an unregistered type is not removed: it
   stays in place as an **opaque object** (`OpaqueObjectDoc`), untouched inside, and is reported in `warnings` as
   well. It needs an id to be referred to and kept in place, so only one without an id is removed (cascading to
   groups left empty and to connectors pointing at what it held).
3. **Structural validation `checkStructure`** — Validates each node's type and required fields.
   Type-specific validation is delegated to the doc-validator registry the parser built, and only the recursion into a
   `group`'s `children` is handled here as a structural rule. This stage also reports every field written on an object
   that the type does not hold (`validateDocKeys`) — a misspelling, or a style a shape does not take, such as a `fontWeight` on a
   `markdown` card. It knows which names a type holds from that type's definition (`features` + `extraKeys`), so the
   check covers every registered type and no `validateDoc` carries an allow-list of its own. That is a **warning**
   (`SemanticDiagnostic.severity`), not an error: the document still loads, and the parser removes the field from
   `ok.doc`, so the next save is where it disappears. The warning carries `unknownKeyPath`, the position the parser
   removes, since the name itself may be any string a file holds. The same check reaches into the containers doc
   itself defines — a text run, a slot, a poly vertex, a connector's endpoint, anchor and label — and `checkStructure`
   applies it to the document's own frame (the root, `view`, `view.padding`). Not to `meta`, which is an open record,
   nor to a nested object a type declares through `extraKeys` (a callout's `tail`): the mapper passes such a value
   through whole, so nothing in it is lost. Nothing inside an opaque object is judged this way.
   When an error is found anywhere in the document, the result is a `structure-error` carrying the errors alone — a
   document that will not open has nothing to save.
4. **Semantic validation `checkSemantics`** — Validates consistency that can only be judged by
   traversing the entire document.
   - **Uniqueness of IDs**: IDs must not be duplicated across the root tree (including connectors).
     Because `CanvasDoc` is a nested tree, a "parent-child cycle" cannot occur structurally; any case that looks like a cycle is effectively "different objects sharing the same ID" — that is, nothing more than an ID duplication.
   - **Referential integrity of connectors**: an owner's `id` must exist, and the referenced target must be of a connectable type (decided by the type's `features.connectable`; e.g. group and connector are not). An id of an opaque object, or inside its `children`, only has to exist: its type cannot be judged.
   - **Self-loop ends**: a self-loop, where source and target point to the same object, is permitted, but a `center` anchor on either end is a semantic error (both ends must be pinned to a connectPoint). While its `points` are empty, a self-loop is drawn as a rectangular loop via a dedicated orthogonal route; vertices replace that fixed ring with the authored path (see `resolveConnectorPoints` / `routeSelfLoop`).

The doc-validator registry used for validation is needed only at parse time, so each parser builds its
own from the definition set it is given. Nothing global is mutated, so two parsers with different plugin
sets can coexist in one process.

### Round-tripping Opaque Objects

An object of a type the reader does not know (a plugin shape the host does not ship, a shape from a newer
version) survives every edit path and is written back where it was. What counts as unknown is decided by each
reader: the parser by its registry, a DocOps instance by its definitions, the canvas by its mapper.

- **Canvas**: `canvasToState` keeps an object of a type with no mapper out of `objects` and holds it in
  `CanvasState.opaqueObjects`, together with where it sat (its container, and the known siblings drawn before
  it). A group all of whose children are opaque, and a connector with an end on something `objects` will not
  hold, are held aside whole the same way. Drawing, hit-testing, selection and editing all read `objects`, so
  these are neither drawn nor touchable. `canvasToDoc` puts them back: after the nearest preceding sibling still
  there, or, when their group itself is gone, where the group was. The one exception is an opaque connector
  whose shape at one end was deleted, which is not written back — the same way deleting a shape takes its
  connectors.
- **DocOps**: the ops never walk into an opaque object (a `children` array on it does not make it a group). It
  can be deleted, restacked and grouped, but the ops that edit what is inside an object — move, resize, style
  — leave it alone. `listObjects` lists it flagged `unknownType: true`.

### A Headless Package

The whole document layer is a separate package, `@jiscribe/doc`, which includes no UI dependencies (react / emotion / katex).
It is aimed at consumers who "just want to parse text into a `CanvasDoc`" or build one programmatically (such as the DiagnosticProvider on the Node side of the VSCode extension, or the MCP server).

```ts
import { createCanvasParser } from "@jiscribe/doc";
```

Assuming that any Doc that has passed this boundary is valid, internal functions omit defensive checks
(principle 4 of the [Design Philosophy](./01-design-philosophy.md)). For validation at the entry point of external sync, see
[External Sync / VSCode Integration](./07-external-sync.md).
