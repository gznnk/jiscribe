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

A kind a type declares for itself is not in the union: it travels as
`ExtraStyleIntent` (`{ kind: string; value: unknown }`), the engine knowing
neither what the kind means nor what type it holds. The value is the transport
string where the surface held only a name and a string (`styleIntentOf`), and the
value already typed where it holds the declaration
(`{ kind: "headerHeight", value: 32 }`); the declaring type's entry reads it.

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
	/** The object's own fields this entry writes, for the registration check. */
	readonly fields?: readonly string[];
};
```

`read` answers a list rather than one value because one object can hold several
places the intent lands on (a table row covering a line of cells), which is what
lets the reader report an object as disagreeing with itself. Values come out
resolved through the type's defaults, so what is reported is what the object is
drawn with and the menus hold no local constants.

`StyleTable<TState>` is what one type answers for, by kind. A kind left out is the
gate at its coarsest: the type does not take that intent. The engine's own kinds
are typed one by one; any other key is a kind the declaring type owns, under an
index signature of `ExtraStyleEntry`, whose value type is unknown to the engine
(every engine entry is assignable to it too, which is what lets the two halves sit
in one intersection). An entry also states **which fields it writes**
(`StyleEntry.fields`), which is what registration checks against the type's doc;
the engine's own entries state none, their fields being vouched for by the very
flags they are derived from.

`StyleContext` is what an entry is handed besides the object and the value:

| Field                | What it is for                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| `selected`           | Whether this target is selected itself or a descendant reached through a selected group                |
| `shapeStyleDefaults` | Per-type stroke / fill defaults, so a shape `read` answers with what the object is drawn with          |
| `textStyleDefaults`  | Per-type, per-slot text defaults, the same for a slot `read`                                           |
| `textEditRange`      | The stretch of text an open editor has selected, when a per-range write or read is what the edit means |

`ObjectStyleRegistry` holds the tables by type and is filled at bundle creation:
`applyObjectDefinition` registers
`{ ...coreStyleTable(features, facts), ...definition.style }` for every type —
the type's own table last, so a kind it declares replaces the derived one. A type
absent from the registry takes nothing — the walkers skip it rather than guessing
a field (fail-closed).

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

| Helper                                       | Where the value lands                                                                                                                                                                                                                        |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `objectField(field)`                         | One field of the object itself. `read` resolves through `ObjectShapeStyleDefaultsRegistry` (object → the type's own defaults → `SHAPE_STYLE_FALLBACK`), so only the shape-style fields are accepted                                          |
| `slotField(field, { slotsOf })`              | One field of each addressed text slot, and nowhere smaller — what the alignments do, having nothing smaller to apply to                                                                                                                      |
| `runOrSlot(field, { slotsOf })`              | The selected stretch of characters while an editor has one (`resolveRangeEdit`), otherwise the whole slot — stripping the runs that overrode the field, or the slot would change and nothing would look different                            |
| `toggleRunOrSlot(kind, { slotsOf, toggle })` | The field `TOGGLE_FLIPS` names, on a selected stretch and nothing else: a keystroke is not a shape-wide write. It reads what the stretch is drawn with and writes the opposite through `runOrSlot`                                           |
| `fieldEntry(path, valueType)`                | A field of the type's own, dots being a path into a nested object. The value is read against the declared `valueType` here — a string as the transport form it is, a value already of that type as it stands, anything else applying nothing |
| `lockAspectRatioEntry`                       | `lockAspectRatio` on the selected objects alone (`ctx.selected`): a member of a selected group keeps the lock it was drawn with                                                                                                              |
| `textVerticalBasisEntry`                     | `textVerticalBasis`, `"region"` being spelled by removing the field rather than writing itself into it                                                                                                                                       |
| `textContentEntry`                           | The default slot's content (the first key), through `writeTextSlot` — the other slots, the key order, the styling and the content kind all survive                                                                                           |

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
  Passing one of the engine's own kinds types the answer; passing a declared kind
  by name alone answers `SelectionValue<unknown>`, and passing the table it was
  declared in ahead of it (`readSelectionStyle(state, CONNECTOR_STYLE,
"label.fill", registries)`) types the answer from that declaration. The table is
  taken for its type alone; the walk still looks the entry up on each target's own
  registered table.

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
                                                                            │ styleIntentOf    │
ObjectMenu number input, sidebar callback, editor keystroke ── STYLE_INTENT ─→ canvasReducer   ┼─→ applyStyleIntent
    └ a row that knows its property states the intent outright;              ┘
      a widget holding a name and a string reads it with styleIntentOf
```

Both routes end at `applyStyleIntent`. What differs is where the intent comes
from: the gesture route is handed a name and a string by the DOM and reads them,
while the React route (`STYLE_INTENT`) carries an intent already — the surface
that raised it having stated it, through `styleIntentOf` when all it held was a
name and a string.

The slider straddles both routes: pointer interaction (drag and track click) rides
the gesture route, while keyboard interaction produces no gesture and so goes
through `STYLE_INTENT`.

`styleIntentOf(property, value)` is the one place a name and a string are read
into an intent:

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

A toggle is an ordinary intent on the React route: `{ kind: "toggleBold" }` with
`commit: true`, raised from the keystroke itself (`TextToggleIntentKind`), so
nothing translates a "bold" into the field it flips twice and one keystroke still
lands one undo entry — the commit tail of `STYLE_INTENT` is what records it.

### What is not a style write

A multi-selection's aspect-ratio lock belongs to the box drawn around the
selection (`createMultiSelectGroup`), not to any object in it: session state
rather than a document field, which no `StyleEntry` can express. So it is not on
either route — the sidebar's row runs the `toggleLockAspectRatio` command, which
flips the box's own flag for a multi-selection and applies the
`lockAspectRatio` intent otherwise. The row that reports it follows the same
precedence (`getSelectedLockAspectRatio`). The mapper stays in
`INTENT_BY_PROPERTY` because the kind is part of the vocabulary, but no surface
spells the lock as a property any more.

### Performance

Slider drags apply once per pointermove frame, so the walk writes through the #213
`createCowObjects` view (O(changed) instead of an O(all objects) map spread).
Materialization follows the standard split: the gesture route is flattened at
`handleGesture`'s end-of-event choke point, and the `STYLE_INTENT` route, which
bypasses `handleGesture`, materializes right after the write.

## What a type declares

A style that no `ObjectFeatures` flag covers — or one whose storage differs from
what the flags imply — is declared as the type's own `StyleTable`, handed to
`ObjectTypeDefinition.style`:

```ts
export const CONTAINER_STYLE = {
	headerFill: fieldEntry("headerFill", "string"),
	headerHeight: fieldEntry("headerHeight", "number"),
} satisfies StyleTable<ContainerState>;
```

The table is composed over the derived one, **the declaration last**: a kind the
engine's own vocabulary owns is _replaced_ rather than refused, which is what a
type whose storage differs from the core guess (a table's fill, which lives on
the cells) needs. A kind the vocabulary does not own is a style of that type
alone: the declaration's existence **is** the gate, so a name nobody declares
applies to nothing (fail-closed), and a declared name reaches the declaring
objects of the selection — descendants of a selected group included — and no
others. Dots in the name are the write path (`label.fill` merges into
`connector.label`).

An entry states the fields it writes (`fields`, which `fieldEntry` fills from the
root of its path), and **registration refuses one the type's doc cannot hold**:
the admitted names are `extraKeys` plus the ones its `features` imply
(`collectStyleKeys`, and `text`). Without that check an entry could write state
the mapper drops on the way back to the document, which no one would see until a
save.

Because registration flows through `applyObjectDefinition`, plugin shapes added
via `CanvasConfig.plugins` (see [Plugin Architecture](./12-plugin-architecture.md))
get the same capability: `fieldEntry` and `StyleTable` are exported from
`@jiscribe/canvas-sdk`, beside the helpers the engine builds its own entries from
(`objectField` / `slotField` / `runOrSlot` / `toggleRunOrSlot` / `defaultSlotsOf`)
for a type replacing a derived kind. Connector's table is
`controllers/style/connectorStyle.ts` (`CONNECTOR_STYLE`); the container plugin
declares `CONTAINER_STYLE` in `src/style/containerStyle.ts` and hands it to
`createFrameObjectDefinition` from `@jiscribe/canvas-sdk`.

A row states the value back through `useSelectionStyle`
(`@jiscribe/canvas/unstable`), which answers what the whole selection says —
`single` / `mixed` / `none`, folded into something drawable by the
`selectionValue*` helpers — over exactly the objects a write of the same kind
would reach. Passing the table ahead of the kind
(`useSelectionStyle(CONTAINER_STYLE, "headerFill")`) types the answer from the
declaration, so the row narrows nothing and the type's value type is stated once;
read by name alone the value still arrives `unknown`, for the row to narrow with
a guard of its own.

## Adding a style

| Case                                       | What to write                                                                                                                                                                                                                             |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A new style of the engine's own vocabulary | A kind in `StyleIntent`, an entry in `coreStyleTable` / `textStyleTable` under the declaration that enables it, and a mapper in `INTENT_BY_PROPERTY` — the `satisfies` over `SystemStyleName` makes any one of them alone a compile error |
| A new storage shape for an existing style  | A helper in `entries/` returning the `{ apply, read }` pair, used by the table that needs it                                                                                                                                              |
| A style belonging to one type              | One entry in that type's own `StyleTable` — `fieldEntry` for a field of its own (plus `style` in its definition, first time only), and its root field in `extraKeys`                                                                      |
| A storage the derived entry gets wrong     | An entry under that very kind in the type's own table, which replaces the derived one                                                                                                                                                     |

Regression safety: `style/__tests__/styleIntentOf.test.ts` covers the
translation, and the apply side of it —
`gestures/handlers/menu/utils/__tests__/applyStylePropertyPart.test.ts`, the one
route still carrying a name and a string — is
registry-driven — it enumerates every kind the types declare in the real bundle
wiring and checks the gate, the nested write and that the entry writes the field
it says it does. A new declaration is covered automatically; what each declared
type reads its value as is the entry's own business
(`style/__tests__/fieldEntry.test.ts`), and the registration check has its own
suite (`registries/__tests__/applyObjectDefinition.style.test.ts`).
