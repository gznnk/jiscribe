> 🌐 日本語版: [10-style-properties.ja.md](./10-style-properties.ja.md)

# Style System

How a style edit reaches the document: the surfaces state **what the edit means**,
and each object type answers **where that lands in its own data**. Nothing in
between guesses a field from a property name.

The two layers are `StyleIntent` (the meaning, with a typed value) and a per-type
`StyleTable` of `{ apply, read }` entries. One walk over the selection serves both
writing and reporting, so a menu row and the write behind it can no longer
disagree about who was addressed.

Everything in this chapter lives in `controllers/style/`.

## Layer 1: the intent

`StyleIntent.ts` declares the whole vocabulary in one union — "paint the face",
"thicken the line", "redden the letters" — each kind carrying its value in its own
type:

```ts
type StyleIntent =
	| { kind: "fill"; color: string }
	| { kind: "strokeWidth"; width: number }
	| { kind: "cornerRadius"; radius: number }
	| { kind: "fontColor"; color: string }
	| { kind: "toggleBold" }
	| { kind: "lockAspectRatio"; locked: boolean }
	| { kind: "textContent"; text: string }
	| …;
```

An intent names no field of any document. Where the vocabulary and the doc's
fields happen to agree (`fill` ⇔ `fill`) that is the type's answer, not a rule;
where they differ the intent is named after the meaning (`cornerRadius` lands in
the SVG attribute `rx`).

Three facts ride on the union:

- `StyleIntentKind` — the kind alone, which is the key a table answers under.
- `StyleIntentValueType<K>` — the type of one kind's value, derived as "the sole field besides
  `kind`". `apply` and `read` of an entry are both bound to it, so the two sides
  cannot disagree on the type.
- `TOGGLE_FLIPS` — which field each of the three keystroke toggles flips
  (`toggleBold` → `fontWeight`). A toggle's value type is its field's, stated once
  here for the types and the entries alike.

A name a shape declares for itself is not in the union: it travels as
`ExtraStyleIntent` (`{ kind: string; value: string }`), whose value stays the
transport string because the engine knows neither what the name means nor what
type it holds.

## Layer 2: the per-type table

`StyleEntry<TState, V>` is a pair, written together on purpose — an intent a type
can be asked to apply is one it has to be able to report back:

```ts
type StyleEntry<TState extends ObjectState, V> = {
	/** This object with the intent reflected in it, or null when the intent does not reach it. */
	apply(
		object: TState,
		pick: ObjectPartSelection | null,
		value: V,
		ctx: StyleContext,
	): TState | null;
	/** The current value at every place on this object the intent would land; empty when it does not reach it. */
	read(
		object: TState,
		pick: ObjectPartSelection | null,
		ctx: StyleContext,
	): readonly V[];
};
```

`read` answers a list rather than one value because one object can hold several
places the intent lands on (a table row covering a line of cells), which is what
lets the reader report an object as disagreeing with itself. Values come out
resolved through the type's defaults, so what is reported is what the object is
drawn with and the menus hold no local constants.

`StyleTable<TState>` is what one type answers for, by kind. A kind left out is the
gate at its coarsest: the type does not take that intent. The engine's own kinds
are typed one by one; any other key is a shape's own entry under an index
signature of `ExtraStyleEntry`, whose value type is unknown to the engine (every
engine entry is assignable to it too, which is what lets the two halves sit in
one intersection).

`StyleContext` is what an entry is handed besides the object and the value:

| Field                | What it is for                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| `selected`           | Whether this target is selected itself or a descendant reached through a selected group                |
| `shapeStyleDefaults` | Per-type stroke / fill defaults, so a shape `read` answers with what the object is drawn with          |
| `textStyleDefaults`  | Per-type, per-slot text defaults, the same for a slot `read`                                           |
| `textEditRange`      | The stretch of text an open editor has selected, when a per-range write or read is what the edit means |

`ObjectStyleRegistry` holds the tables by type and is filled at bundle creation:
`applyObjectDefinition` registers
`{ ...coreStyleTable(features, facts), ...extraStyleTable(type, extras) }` for
every type. A type absent from the registry takes nothing — the walkers skip it
rather than guessing a field (fail-closed).

## The table a type gets for free

`coreStyleTable(features, facts)` reads the feature flags **once**, when the table
is built, and nothing reads them again afterwards:

| Declaration                          | Entries                                                    |
| ------------------------------------ | ---------------------------------------------------------- |
| `features.fill`                      | `fill`, `fillOpacity`                                      |
| `features.stroke`                    | `stroke`, `strokeWidth`, `strokeDashType`, `strokeOpacity` |
| `features.radius`                    | `cornerRadius` (stored in `rx`)                            |
| `features.arrow`                     | `startArrow`, `endArrow`                                   |
| `features.transform`                 | `lockAspectRatio`                                          |
| `features.text`                      | `textStyleTable(features.text, defaultSlotsOf)`            |
| `hasInsetTextRegionType(definition)` | `textVerticalBasis`                                        |

The last row is the one verdict a flag cannot carry, so it is read off the whole
definition by its own predicate: a type whose text region is its whole box names
one place with both bases, and the switch would be a control that does nothing.

`textStyleTable(textType, slotsOf)` derives the text half from the one thing a
type declares about its text — which fields it may carry at all
(`textStyleKeysOf`). A body written in a source language sets its emphasis through
its own syntax, so it is left out of those intents without anyone branching on the
text type again:

| Fields accepted  | Entries                             |
| ---------------- | ----------------------------------- |
| any text at all  | `textContent`                       |
| `fontColor`      | `fontColor`                         |
| `fontSize`       | `fontSize`                          |
| `fontFamily`     | `fontFamily`                        |
| `fontWeight`     | `fontWeight`, `toggleBold`          |
| `fontStyle`      | `fontStyle`, `toggleItalic`         |
| `textDecoration` | `textDecoration`, `toggleUnderline` |
| `textAlign`      | `textAlign`                         |
| `verticalAlign`  | `verticalAlign`                     |

## The helpers that build the pairs

Entries are not written by hand; a helper per storage shape returns the pair
(`controllers/style/entries/`):

| Helper                                       | Where the value lands                                                                                                                                                                                             |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `objectField(field)`                         | One field of the object itself. `read` resolves through `ObjectShapeStyleDefaultsRegistry` (object → the type's own defaults → `SHAPE_STYLE_FALLBACK`), so only the shape-style fields are accepted               |
| `slotField(field, { slotsOf })`              | One field of each addressed text slot, and nowhere smaller — what the alignments do, having nothing smaller to apply to                                                                                           |
| `runOrSlot(field, { slotsOf })`              | The selected stretch of characters while an editor has one (`resolveRangeEdit`), otherwise the whole slot — stripping the runs that overrode the field, or the slot would change and nothing would look different |
| `toggleRunOrSlot(kind, { slotsOf, toggle })` | The field `TOGGLE_FLIPS` names, on a selected stretch and nothing else: a keystroke is not a shape-wide write. It reads what the stretch is drawn with and writes the opposite through `runOrSlot`                |
| `extraField(path, valueType)`                | The field a shape's own declaration names, dots being a path into a nested object. The transport string is read with the declared `valueType` here, the boundary not knowing a plugin's vocabulary                |
| `lockAspectRatioEntry`                       | `lockAspectRatio` on the selected objects alone (`ctx.selected`): a member of a selected group keeps the lock it was drawn with                                                                                   |
| `textVerticalBasisEntry`                     | `textVerticalBasis`, `"region"` being spelled by removing the field rather than writing itself into it                                                                                                            |
| `textContentEntry`                           | The default slot's content (the first key), through `writeTextSlot` — the other slots, the key order, the styling and the content kind all survive                                                                |

`slotEntry` is the part `slotField` and the whole-slot half of `runOrSlot` share:
which slots are reached, the same-reference contract, and reading each of them
through the type's defaults.

Which slots an intent lands on is the type's own answer, handed in once as
`SlotsOf<TState>`. The core types use `defaultSlotsOf`: the slot picked below the
object when one is picked, otherwise every slot the object holds — which is what
makes a text style written with nothing picked reach the whole shape. A type whose
slots are not the keys of its `text` hands in its own.

A nested write merges into an existing parent and **never fabricates one**: a
connector with no label takes no `label.*` write at all, rather than growing a
label out of a colour press.

## The one reading of the selection

`collectStyleTargets(state)` is the style layer's single interpretation of the
selection. It yields, in selection order, each selected object followed by the
descendants it contributes when it is a group:

- `pick` is handed over only where the selection is that one object
  (`CanvasSelection.part` belongs to the sole selected object), so a descendant and
  any member of a multi-selection are addressed whole.
- `selected` tells an entry which of the two it is looking at, which is how the
  intents that do not descend (`lockAspectRatio`, `textVerticalBasis`) gate
  themselves and the walk needs no branch of its own.
- A selected connector is one target among the rest.

Both walkers take that walk:

- `applyStyleIntent(state, intent, registries)` — writes every target through its
  own type's entry for the intent. A target whose type takes no such intent, or
  whose entry answers null, is left as it stands; a walk that changed nothing
  returns `state` itself.
- `readSelectionStyle(state, kind, registries)` — reads every target the same way
  and folds the values into `single` / `mixed` / `none` (`combineSelectionValues`).
  Passing one of the engine's own kinds types the answer; passing a shape's own
  name answers `SelectionValue<unknown>`.

### The draft an open editor holds

The shape editor's draft is not committed to the slot until the session ends, so a
write landing on the slot underneath it would be overwritten by the next
keystroke. The walkers own that rule rather than the entries:
`resolveStyleTextEdit` reports the open edit, the edited object is handed over with
the draft **grafted** into the slot being edited, and the slot is read back into
the draft afterwards. A graft the entry did not write to is dropped. No entry
knows an editor exists; `StyleContext.textEditRange` carries the offsets alone.

`resolveStyleTextEdit` also owns when a selected stretch is one to style at all: a
collapsed (or unreported) selection is not, and neither is any stretch of a body
written in a source language — a run laid over part of it would be dropped on save
and never drawn, so the edit takes the whole slot instead.

## The transport boundary

The surfaces carry a property **name** and a **string**, because that is what the
DOM can hold in a `data-part` (`menuParts.ts`):

- `set:{property}:{value}` — write a style property outright; the value may itself
  contain `:`
- `slider:{property}` — a slider whose value rides on the event (`inputValue`)
  rather than in the part

```
ObjectMenu item / slider, sidebar swatch ── gesture (set: / slider:) ─→ applyStylePropertyPart ┐
ObjectMenu number input, sidebar callback ── STYLE_PROPERTY_UPDATE ──→ canvasReducer           ┼─→ applyStyleProperty
                                                                                               ┘        │
                                                                                      INTENT_BY_PROPERTY │
                                                                                                         ↓
                                                                                              applyStyleIntent
```

The slider straddles both routes: pointer interaction (drag and track click) rides
the gesture route, while keyboard interaction produces no gesture and so goes
through `STYLE_PROPERTY_UPDATE`.

`applyStyleProperty(state, property, value, registries)` is the only place a name
and a string are read into an intent:

- `INTENT_BY_PROPERTY` maps each name of the engine's own vocabulary to the intent
  its string makes. It is `satisfies Record<SystemStyleName, StyleIntentMapper>`,
  where `SystemStyleName` is the union of the keys the doc's style groups declare
  (`*_STYLE_KEYS`) plus the three no group owns (`text`, `lockAspectRatio`,
  `textVerticalBasis`) — so a field added to a group fails to compile until it is
  given a mapper, and a name no group owns cannot be mapped by accident.
- A mapper answering undefined is a value nothing can be made of (a string no
  number parses from), which applies nothing.
- A name no mapper knows becomes `{ kind: property, value }`, and the types' tables
  decide whether anything takes it.

The keystroke route skips the boundary: `TOGGLE_TEXT_FORMAT` carries a
`TextToggleIntentKind` from the keystroke itself and calls `applyStyleIntent`
directly, so nothing translates a "bold" into the field it flips twice.

### The one exception

A multi-selection's aspect-ratio lock belongs to the box drawn around the
selection (`createMultiSelectGroup`), not to any object in it: session state
rather than a document field, which no `StyleEntry` can express.
`applyStyleProperty` writes `multiSelectGroup` for that case and returns. The row
that reports it follows the same precedence (`getSelectedLockAspectRatio`).

### Performance

Slider drags apply once per pointermove frame, so the walk writes through the #213
`createCowObjects` view (O(changed) instead of an O(all objects) map spread).
Materialization follows the standard split: the gesture route is flattened at
`handleGesture`'s end-of-event choke point, and the `STYLE_PROPERTY_UPDATE` route,
which bypasses `handleGesture`, materializes right after the write.

## What a shape declares

A style that no `ObjectFeatures` flag covers is declared next to the shape's Doc
as `…ExtraStyleProperties` and wired through `extraStyleProperties` of its
`ObjectTypeDefinition`:

```ts
export const ContainerExtraStyleProperties = {
	headerFill: { valueType: "string" },
	headerHeight: { valueType: "number" },
} as const satisfies Record<string, ExtraStylePropertyDescriptor>;
```

`extraStyleTable` turns each declaration into an `extraField` entry of that type's
table, under the declared name. The declaration's existence **is** the gate: a
name nobody declares applies to nothing (fail-closed), and a declared name reaches
the declaring objects of the selection — descendants of a selected group included —
and no others. Dots in the name are the write path (`label.fill` merges into
`connector.label`).

A name the engine's own vocabulary owns **throws at registration**, naming the
type and the name: the boundary would read such a name into its own intent, so the
entry would never be reached and the declaration would quietly do nothing.

Because registration flows through `applyObjectDefinition`, plugin shapes added
via `CanvasConfig.plugins` (see [Plugin Architecture](./12-plugin-architecture.md))
get the same capability. Connector's declaration is in
`model/objects/connector/ConnectorDoc.ts` of `@jiscribe/doc`; the container plugin
declares `ContainerExtraStyleProperties` in `src/schema/ContainerDoc.ts` and hands
it to `createFrameObjectDefinition` from `@jiscribe/canvas-sdk`.

What a plugin can rely on today is that declaration and
`useSelectionStyle(name)` (`@jiscribe/canvas/unstable`) for stating the value
back in its own rows of either surface. The hook answers what the whole selection
says — `single` / `mixed` / `none`, folded into something drawable by the
`selectionValue*` helpers — over exactly the objects a write of the same name
would reach. A declared name is one the engine knows nothing about, so its value
arrives `unknown` and the row narrows it (`selectionValueAs` with a guard of its
own). The style layer itself is internal: a type cannot yet replace a derived
entry, which is what a shape whose storage differs from the core guess (a table's
fill, which lives on the cells) needs. A declarative
`ObjectTypeDefinition.style` override is planned for that and **is not available**.

## Adding a style

| Case                                       | What to write                                                                                                                                                                                                                             |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A new style of the engine's own vocabulary | A kind in `StyleIntent`, an entry in `coreStyleTable` / `textStyleTable` under the declaration that enables it, and a mapper in `INTENT_BY_PROPERTY` — the `satisfies` over `SystemStyleName` makes any one of them alone a compile error |
| A new storage shape for an existing style  | A helper in `entries/` returning the `{ apply, read }` pair, used by the table that needs it                                                                                                                                              |
| A style belonging to one shape             | One entry in that shape's `…ExtraStyleProperties` (plus `extraStyleProperties` in its definition, first time only)                                                                                                                        |

Regression safety: `style/__tests__/applyStyleProperty.test.ts` is
registry-driven — it enumerates every shape-declared extra in the real bundle
wiring and checks the gate, the value reading and the nested write, plus that the
shapes declaring the same name agree on its `valueType`. A new declaration is
covered automatically.
