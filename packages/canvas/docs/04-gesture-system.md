> 🌐 日本語版: [04-gesture-system.ja.md](./04-gesture-system.ja.md)

# Gesture System

The mechanism that converts pointer/wheel events into high-level gestures and dispatches them to the appropriate handlers.
For how the state changes triggered by gestures are reflected, see [State Update Flow](./06-state-update-flow.md).

## GestureRecognizer: Recognizing gestures from pointers

Raw pointer/wheel events are aggregated at the canvas root (`Viewport`), and
the `GestureRecognizer` (`controllers/gestures/recognizer/`) converts them into a `Gesture`.

There are eleven `GestureType`s:

```
pressed | dragStart | drag | dragEnd | click | doubleClick | wheel | pinch | longPress
inertialScroll | inertialScrollEnd
```

A `Gesture` carries both SVG and client coordinates (`start` / `last` / `delta`), modifier keys
(`mods`), the hovered elements (`getHovered()`, a lazy + memoized hit test), `targetId` / `targetKind`,
`inputValue` (the value of a `native-pointer` element), and more.

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
- **Two-finger pinch (touch)**: A second touch pointerdown arriving before the first touch confirms a drag
  discards the pending press and enters pinch mode; `pinch` gestures carry `zoomScale` (finger-distance
  ratio) and `scrollDelta` (midpoint movement), coalesced to one per frame (`settleBatch`).
  During a canvas pan drag the second touch closes the pan with `dragEnd` and enters the pinch; during an
  object drag or shape drawing — and for mouse/pen — an extra pointerdown is simply ignored (palm
  rejection, issue #25).
- **Touch long press**: A touch press held for `LONG_PRESS_DURATION_MS` (500ms) within the touch drag slop
  fires `longPress` and consumes the gesture (the lift fires no click). It routes to CanvasEventHandler
  wherever it lands — per-target handlers reject it via `isPerTargetInteraction`, like middle/right
  buttons — and opens the context menu, mirroring the right-button click.
- **Inertial scrolling**: A middle-/right-button pan released while still moving keeps gliding. The
  recognizer records raw pointer samples in `enqueue` (`feed` sees at most one move per frame, too coarse
  to measure a flick), estimates the release velocity over `FLING_VELOCITY_WINDOW_MS` (`calcFlingVelocity`),
  and then emits one `inertialScroll` per frame from its own RAF until the exponentially decayed speed
  falls below `FLING_STOP_SPEED`. Which drags glide is the consumer's knowledge, injected as
  `shouldFlingFromDrag` (middle/right buttons) the way `shouldPinchFromDrag` is. A pointer coming to rest
  before it lifts (`FLING_RELEASE_IDLE_MS`) means "stop here", and any new pointerdown or wheel stops a
  glide in progress at once.
  However it ends, the glide closes with a single `inertialScrollEnd` (every exit routes through
  `stopFling`). No frame reveals that it was the last one, so that gesture is what lets the state know:
  `handleGesture` keeps `inertialScrolling` up across the frames and takes it down there, and the
  ObjectMenu stays hidden for the whole glide instead of reappearing at `dragEnd` and flying across the
  screen with the selection.
- **Touch panning**: Gestures carry `pointerType`, and CanvasEventHandler routes a one-finger touch drag on
  the canvas background to viewport panning (the GrabScroll path) instead of area selection. Area selection
  is unavailable on touch for now. On touch, background deselection waits for the tap to resolve (`click`)
  instead of firing on `pressed`, and the per-target handlers defer the text-edit commit for a touch press
  the same way (`commitTextEditUnlessTouchPress`), so pans and pinches preserve the selection, open menus,
  and an active edit — even when a pinch finger lands on an object or control.

## Handler composition: canvas / controls / menu / objects

`handleGesture` (`controllers/gestures/handlers/handleGesture.ts`) is the router.
It converts a `Gesture` into a `CanvasEvent` (`wheel` branches into `zoom` / `scroll` depending on whether `ctrl` is held;
`inertialScroll` always becomes `scroll`; `pinch` decomposes into `zoom` followed by `scroll`;
`inertialScrollEnd` is consumed there as a state transition and routed nowhere)
and passes it to the target handler via `gestureHandlerRegistry`. Each handler uses `targetKind` to
determine whether it should process the event. The registry holds exactly one handler per
`targetKind`; where a kind needs finer splitting (by `targetId`, `data-part`, or event type), that
handler is a router delegating to sub-handlers inside its own folder.

| Handler group | Target                                                                                                              | Main files                                                                                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `canvas/`     | The entire canvas (empty-space drag = range selection, pan, zoom)                                                   | `CanvasEventHandler.ts`                                                                                                                                                                       |
| `controls/`   | Transform controls (resize, rotate, vertex, connection)                                                             | `ControlEventHandler.ts`, `transform/`, `vertex/`, `connection/`                                                                                                                              |
| `menu/`       | Context menu, object menu, toolbar, stencil library                                                                 | `MenuEventHandler.ts` (router), `ContextMenuHandler.ts`, `ObjectMenuHandler.ts`, `ToolbarHandler.ts`, `StencilLibraryItemHandler.ts`, `StencilCategoryToggleHandler.ts`                       |
| `objects/`    | Shapes and connectors themselves (move, select, launch text editing, drag a connector label or one of its segments) | `ObjectEventHandler.ts`, `ConnectorEventHandler.ts` (router), `ConnectorClickHandler.ts`, `ConnectorLabelDragHandler.ts`, `ConnectorSegmentSlideHandler.ts`, `ConnectorSegmentMoveHandler.ts` |

On `dragStart`, `handleGesture` saves `eventStartSnapshot` (the objects / keyPoints /
snapCandidates, etc. at the start of the operation), and clears it on `dragEnd`. If the doc has actually changed
on `dragEnd`, it advances `commitVersion`, triggering history recording (see [State Update Flow](./06-state-update-flow.md) for details).

`activeDragKind` (`"move"` / `"transform"` / `"other"`) follows that same
`dragStart` / `dragEnd` boundary: `handleGesture` starts every drag at `"other"` and clears it
on `dragEnd`, so `!== null` always means "a drag is under way". A handler whose drag needs to be
told apart overwrites the kind in its own `dragStart` — `ObjectEventHandler` sets `"move"` and
`TransformControlHandler` sets `"transform"`. The UI reads it to hide the transform frame and the
connection anchors while a selection is moved, the anchors while it is transformed, and the
ObjectMenu for every kind of drag.

`inertialScrolling` is the glide's counterpart and deliberately a separate field: no pointer is down
and no `eventStartSnapshot` is open during a glide, so folding it into `activeDragKind` would break
the pair those two form. Only the ObjectMenu reads it, hiding for the glide the way it hides for the
pan that preceded it. Being two states, they hand over with a gap of a frame or more where neither is
set — as do a glide and the pan that interrupts it — so the menu's own condition is run through
`useLingeringFlag`: it hides at once and only comes back once the view has been still for
`REAPPEAR_DELAY_MS`, which is what keeps those handovers from flashing it.

## Linking attributes `data-gesture` / `data-kind` / `data-id` / `data-part`

DOM elements on the canvas interoperate with the gesture system through `data-*` attributes.
This convention allows **elements that should retain native browser behavior**—such as the editing surface used during
text editing or the input fields inside menus—to be handled declaratively.

### `data-gesture`

Declares how an element relates to gestures. It takes a **space-separated token list**, and each token is
**searched toward ancestors via `closest`** using `[data-gesture~="token"]`.

| Token            | Meaning                                                                                                                                | Primary targets                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `none`           | Does not become the origin of a gesture. Ignores pointerdown and leaves contextmenu to the native handler                              | The wrapper of the text editing surface, numeric/color inputs inside menus, callback items in the context menu |
| `native-pointer` | Participates in gestures but **does not perform pointer capture**. Also becomes a target for `inputValue` harvesting                   | Sliders (range input)                                                                                          |
| `native-wheel`   | If the element is scrollable (`scrollHeight > clientHeight`), leaves wheel to native scrolling (excluded while Ctrl is held, for zoom) | The text editing surface                                                                                       |

Combined example: `data-gesture="none native-wheel"` (excluded from gestures and uses native scrolling).

Where they are read:

- `none` → `isGestureOptedOut` (onPointerDown in `GestureRecognizer.getHandlers()`, handleContextMenu in `Canvas.tsx`)
- `native-pointer` → `isNativePointerTarget` (suppresses capture and enables `inputValue` harvesting; decided once at pointerdown and held on `Pressed`)
- `native-wheel` → `shouldUseNativeWheel` (`useCanvasWheel`)

All of these decision utilities are built on `findGestureElement(target, token)` and
are located in `controllers/gestures/recognizer/utils/`.

### `data-kind` / `data-id` / `data-part`

Attributes that **identify the target** of a gesture. `getGestureTarget` finds the nearest element via `closest("[data-kind]")`,
resolves `{ kind, id, part }`, and attaches it to the event as `targetKind` / `targetId` / `targetPart`. `part` is read from the
nearest `[data-part]` **at or inside** that element, so a shape that draws several hit regions can mark each one while still
exposing a single `[data-kind]` element (one object = one `data-kind="object"` element, which e2e's `captureObjects` counts on).

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
With a committed label, only a double click on the label box (not the bare line) starts label editing,
and dragging the box moves the label along the path (`label.position` / `label.offset`),
with `offset` snapping to 0 within `SNAP_THRESHOLD_PX` of the line (bypassed by holding Ctrl).
With no label yet, a double click on the bare line creates one at the clicked point (projected onto
the path and snapped the same way), carried in `textEditState` until the edit is committed.
A multi-slot shape uses the nested form instead: the `record` shape's `<g data-kind="object">` wraps two
compartment rects carrying `data-part="name"` / `data-part="rows"`, which is how a double click resolves
the text slot it landed in (`resolveTextSlotId` checks the value against the keys of `state.text`).

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

## Sharing gestures with the host page (`gestureHandling`)

A canvas that fills the window should keep every scroll gesture; one embedded in a document that
scrolls (a landing hero, an article figure) must not, or the reader who scrolls onto it is stranded.
The `<Canvas gestureHandling>` prop (`"greedy"` by default, `"cooperative"` to defer — after the
same-named option of embedded maps) picks between the two.

The line it draws is **scroll versus zoom**, not wheel versus everything else. Under `"cooperative"`:

- A plain wheel returns from `useCanvasWheel` before `preventDefault`, so the browser scrolls the
  host document and the recognizer never sees the event.
- Ctrl+wheel is a zoom, so it takes the normal path and zooms the canvas. A trackpad pinch arrives
  as a Ctrl-held wheel, which lands in the same branch.
- On touch the split runs by what the finger lands on. `CanvasRoot` relaxes `touch-action` from
  `none` to `pan-x pan-y`, so a one-finger background drag scrolls the host page (the handler also
  refuses to pan the viewport from it — otherwise a drag the page has no room to take would still
  move the canvas). A touch starting on a shape stays a shape drag: the working claim is the
  non-passive `touchstart` guard in `useCooperativeTouchClaim`, because Chromium and WebKit ignore
  `touch-action` on inner SVG elements. Moving the view itself takes two fingers, which neither
  `touch-action` value hands to the browser, so the pinch keeps panning and zooming the canvas.

Covered by `e2e/specs/scenario/embedded-page-scroll.spec.ts`, against the `?pageScroll` harness page.

## Repeat buttons treat click and doubleClick equivalently

For controls where you want to **repeatedly tap the same button and have it fire every time**, such as the toolbar's
zoom ± buttons, the handler uses **both** `click` and `doubleClick` as execution triggers.

```ts
const isActivation = event.type === "click" || event.type === "doubleClick";
if (isActivation && event.targetPart?.startsWith(COMMAND_PREFIX)) {
	return handleCommand(state, commandId);
}
```

The reason is the exclusivity spec described above. Since a repeat command button has no "doubleClick-specific meaning,"
picking up only `click` would skip every other tap during rapid tapping (the second event is discarded as a `doubleClick`).
Because the object- and text-related handlers depend on the recognizer's exclusivity spec, we leave it unchanged and instead
**treat both events equivalently in the consuming handler**, achieving "N taps = N executions" locally and with low risk.

- Applies to: `controllers/gestures/handlers/menu/ToolbarHandler.ts`
- Related constant: `DOUBLE_CLICK_THRESHOLD` (`recognizer/GestureRecognizerConstants.ts`)
