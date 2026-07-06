> 🌐 日本語版: [04-gesture-system.ja.md](./04-gesture-system.ja.md)

# Gesture System

The mechanism that converts pointer/wheel events into high-level gestures and dispatches them to the appropriate handlers.
For how the state changes triggered by gestures are reflected, see [State Update Flow](./06-state-update-flow.md).

## GestureRecognizer: Recognizing gestures from pointers

Raw pointer/wheel events are aggregated at the canvas root (`Viewport`), and
the `GestureRecognizer` (`controllers/gestures/recognizer/`) converts them into a `Gesture`.

There are seven `GestureType`s:

```
pressed | dragStart | drag | dragEnd | click | doubleClick | wheel
```

A `Gesture` carries both SVG and client coordinates (`start` / `last` / `delta`), modifier keys
(`mods`), the hovered element, `targetId` / `targetKind`, `inputValue` (the value of a `native-pointer` element),
and more.

Key points:

- **click and doubleClick are mutually exclusive**: If the same target — the `(targetId, targetPart)` pair —
  is tapped repeatedly within `DOUBLE_CLICK_THRESHOLD` (300ms), the second and subsequent events become
  `doubleClick` instead of `click`. Different parts of one target (two buttons of the same menu, a
  connector's line vs its label box) are separate click targets.
  This is a deliberate design for cases where you want to **change the meaning** of the interaction, such as
  "single = select / double = text editing", and object- and text-related handlers depend on it (switching to
  the DOM-standard cumulative counting model would carry a large regression risk).
- **RAF batching**: High-frequency pointermove events are batched into a single `drag` via `requestAnimationFrame`,
  so that no more than one state update per frame is triggered (see the performance priority in [Design Philosophy](./01-design-philosophy.md)).

## Handler composition: canvas / controls / menu / objects

`handleGesture` (`controllers/gestures/handlers/handleGesture.ts`) is the router.
It converts a `Gesture` into a `CanvasEvent` (`wheel` branches into `zoom` / `scroll` depending on whether `ctrl` is held)
and passes it to the target handler via `gestureHandlerRegistry`. Each handler uses `targetKind` to
determine whether it should process the event.

| Handler group | Target                                                               | Main files                                                                                         |
| ------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `canvas/`     | The entire canvas (empty-space drag = range selection, pan, zoom)    | `CanvasEventHandler.ts`                                                                            |
| `controls/`   | Transform controls (resize, rotate, vertex, connection)              | `ControlEventHandler.ts`, `transform/`, `vertex/`, `connection/`                                   |
| `menu/`       | Context menu, object menu, toolbar, shape library                    | `ContextMenuHandler.ts`, `ObjectMenuHandler.ts`, `ToolbarHandler.ts`, `ShapeLibraryItemHandler.ts` |
| `objects/`    | Shapes and connectors themselves (move, select, launch text editing) | `ObjectEventHandler.ts`, `ConnectorEventHandler.ts`, shape-specific Controllers                    |

On `dragStart`, `handleGesture` saves `eventStartSnapshot` (the objects / keyPoints /
snapCandidates, etc. at the start of the operation), and clears it on `dragEnd`. If the doc has actually changed
on `dragEnd`, it advances `commitVersion`, triggering history recording (see [State Update Flow](./06-state-update-flow.md) for details).

## Linking attributes `data-gesture` / `data-kind` / `data-id` / `data-part`

DOM elements on the canvas interoperate with the gesture system through `data-*` attributes.
This convention allows **elements that should retain native browser behavior**—such as the `textarea` used during
text editing or the input fields inside menus—to be handled declaratively.

### `data-gesture`

Declares how an element relates to gestures. It takes a **space-separated token list**, and each token is
**searched toward ancestors via `closest`** using `[data-gesture~="token"]`.

| Token            | Meaning                                                                                                                                | Primary targets                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `none`           | Does not become the origin of a gesture. Ignores pointerdown and leaves contextmenu to the native handler                              | The `textarea` wrapper for text editing, numeric/color inputs inside menus, callback items in the context menu |
| `native-pointer` | Participates in gestures but **does not perform pointer capture**. Also becomes a target for `inputValue` harvesting                   | Sliders (range input)                                                                                          |
| `native-wheel`   | If the element is scrollable (`scrollHeight > clientHeight`), leaves wheel to native scrolling (excluded while Ctrl is held, for zoom) | The `textarea` for text editing                                                                                |

Combined example: `data-gesture="none native-wheel"` (excluded from gestures and uses native scrolling).

Where they are read:

- `none` → `isGestureOptedOut` (onPointerDown in `GestureRecognizer.getHandlers()`, handleContextMenu in `Canvas.tsx`)
- `native-pointer` → `shouldSkipPointerCapture` (suppresses capture) and `getInputValue` (harvests the value)
- `native-wheel` → `shouldUseNativeWheel` (`useDocumentWheel`)

All of these decision utilities are built on `findGestureElement(target, token)` and
are located in `controllers/gestures/recognizer/utils/`.

### `data-kind` / `data-id` / `data-part`

Attributes that **identify the target** of a gesture. `getKindAndId` finds the nearest element via `closest("[data-kind]")`,
resolves `{ kind, id, part }`, and attaches it to the event as `targetKind` / `targetId` / `targetPart`.

Each attribute carries exactly one axis, forming the two-level routing tree `kind` (coarse) → `part` prefix (fine) (issue #81):

| Attribute   | Meaning                                     | Grammar                                                                 |
| ----------- | ------------------------------------------- | ----------------------------------------------------------------------- |
| `data-kind` | **Domain** — 1:1 with a handler group       | one of `object` / `connector` / `canvas` / `control` / `menu`           |
| `data-id`   | **Identity** — which target                 | an entity UUID or a singleton widget name. **Never parsed — no colons** |
| `data-part` | **Sub-element** — which piece of the target | `<subtype>[:<args...>]`; absent = the target's body itself              |

Rules:

- Routing is `kind` → handler, then `part` prefix → strategy. `id` is used only for lookup, never parsed.
- An entity's subtype (rect / connector / …) is never encoded in the DOM; resolve it via `objects[id].type`.
- `part` (args included) is always the **identifier of a sub-element**, parallel to `id` being the identifier
  of the entity. A verb-looking part (`set:fill:red`) names the button by what it does; `part` is not a
  command channel.
- `data-kind` is present only on elements that have a gesture handler. "Interactive but not a gesture
  target" is expressed with `data-gesture="none"`, not with a handler-less kind.

Example: a connector's label box is `data-kind="connector" data-id={connectorId} data-part="label"`.
With a committed label, only a double click on the label box (not the bare line) starts label editing.

#### Migration (issue #81) — completed

The grammar above is fully in effect: menu kinds are consolidated into `menu`, control ids are entity
UUIDs (with `part` carrying the sub-element), and handler-less marker kinds were removed — elements
that only need a test hook use `data-testid` instead of `data-kind` / `data-id`.

### Why we tokenized it

The old implementation scattered this "opt out of gestures" logic across three mechanisms (`e.stopPropagation()` calls
in various places, `data-interactive`, and `data-native-wheel`), and the selection criteria could not be read from the markup.
Since how an element relates to gestures is not exclusive but rather a set of concerns that can be combined (for example, a
text-editing area is both excluded from gestures and uses native wheel scrolling), we unified everything into a
space-separated token list plus `closest` search.

### When adding a new interactive element

1. An element that is fully served by standard browser interaction → `data-gesture="none"`
2. Needs to convey a value via gestures while also requiring native pointer behavior → `data-gesture="native-pointer"` + `data-kind` / `data-id`
3. Scrollable and you want to prioritize internal scrolling → `data-gesture="native-wheel"`

## Repeat buttons treat click and doubleClick equivalently

For controls where you want to **repeatedly tap the same button and have it fire every time**, such as the toolbar's
zoom ± buttons, the handler uses **both** `click` and `doubleClick` as execution triggers.

```ts
const isActivation = event.type === "click" || event.type === "doubleClick";
if (isActivation && event.targetId?.startsWith(COMMAND_PREFIX)) {
	return handleCommand(state, commandId);
}
```

The reason is the exclusivity spec described above. Since a repeat command button has no "doubleClick-specific meaning,"
picking up only `click` would skip every other tap during rapid tapping (the second event is discarded as a `doubleClick`).
Because the object- and text-related handlers depend on the recognizer's exclusivity spec, we leave it unchanged and instead
**treat both events equivalently in the consuming handler**, achieving "N taps = N executions" locally and with low risk.

- Applies to: `controllers/gestures/handlers/menu/ToolbarHandler.ts`
- Related constant: `DOUBLE_CLICK_THRESHOLD` (`recognizer/GestureRecognizerConstants.ts`)
