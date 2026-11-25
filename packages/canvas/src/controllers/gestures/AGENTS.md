# AGENTS.md — controllers/gestures

What has to stay true in the gesture system, for anyone changing code under this
directory. How it works, with the current names, is in
[docs/04-gesture-system.md](../../../docs/04-gesture-system.md); the JSDoc of the
symbol you touch outranks this file where they differ.

## Read before you change behaviour

- Which handler receives an event, and what the drag and the close-out hold:
  "Handler composition" in `docs/04-gesture-system.md`.
- Anything about click, double click, long press, pinch, fling or frame timing:
  "GestureRecognizer" in the same document.
- A new or changed interactive element: "Linking attributes" there.
- What makes an edit reach history and persistence: `docs/06-state-update-flow.md`.

## Invariants

- **A handler is a pure function from the whole state to the whole next state.**
  No DOM access, no timers, no module-level state. One gesture's every consequence
  (selection, movement, snapping, what gets committed) is assembled by the handler
  that owns the target, not spread over owners of single fields.
- **`handleGesture` is a router and the keeper of the drag's lifetime, nothing
  else.** A fix for how one target behaves goes into that target's handler. When
  several handlers need the same step, put it in a shared utility and have each of
  them call it at the event where it applies; do not add the step to the router so
  that it runs for everyone.
- **One handler per `targetKind`.** A kind that needs finer routing gets a router
  in its own folder that delegates to sub-handlers; the list in that router is the
  one place its sub-handlers are named. Do not add a kind for an element that has
  no handler.
- **The recognizer knows pointers, time and distance, not the canvas.** It does
  not read objects, selection, tools or modes. What only the consumer can know
  reaches it as an injected predicate. Thresholds live in its constants file.
- **Each release emits exactly one of click / doubleClick / dragEnd, and a double
  click is decided by time and position alone, never by target.** Handlers rely on
  this. If a control must fire on every tap, make its handler treat click and
  doubleClick alike; do not change the recognizer.
- **A drag is computed from the snapshot taken at its start, every frame.** Never
  accumulate from the previous frame's result. Work that depends on the whole
  document belongs at the start of the drag, not in the per-frame path, and a frame
  causes at most one state update.
- **Buttons and pointer types are filtered by the shared predicates, not ad hoc.**
  Per-target handlers ignore what is not a primary-button interaction the same way
  everywhere, and a touch press defers what a mouse press does at once (ending a
  text edit, clearing the selection) until the tap resolves, so a pan or pinch
  that starts on a target changes nothing.
- **An element says how it relates to gestures in its `data-*` attributes.** Opt
  out with a `data-gesture` token, not with `stopPropagation`. `data-id` is looked
  up and never parsed; what pressing an element starts is its `data-action`, built
  and taken apart by the one module that owns that grammar.
- **No defensive checks for states the parser already rejects.** Code here runs
  per frame and assumes a valid document.

## Docs

When a change alters a rule or adds a concept that `docs/04-gesture-system.md`
describes, update it in the same change, together with its Japanese twin
`04-gesture-system.ja.md`.

## Tests

Handler and recognizer behaviour is tested as state in, state out, in node, under
the `__tests__` directory beside the code. Reach for an e2e spec only for what
needs a real pointer or layout.
