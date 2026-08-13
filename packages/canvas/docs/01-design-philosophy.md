> 🌐 日本語版: [01-design-philosophy.ja.md](./01-design-philosophy.ja.md)

# Design Philosophy

The criteria for reading and writing canvas code. When you're unsure about an
implementation detail, come back to these four principles to make the call.
Each principle is made concrete in the documents that follow.

## 1. Prioritize performance above all

A canvas involves high-frequency updates such as "recomputing state on every frame
during a drag." For that reason, whenever a design decision could go either way,
**prioritize performance**. This is the rationale behind the other principles
(where to place defensive checks, how to normalize state, and so on).

Concrete examples:

- State is normalized into a flat shape (an ID-keyed `Record`) to speed up lookups
  and updates during editing operations
  → [Data Model and Persistence](./03-data-model-and-persistence.md)
- keyPoints / snapCandidates are cached on a reference-comparison basis, and only
  the objects that changed are recomputed
  (the cache update on `dragStart` in `handleGesture`)
- Validity checks are not duplicated throughout the internals; they are concentrated
  at the input boundary (Principle 4)

## 2. Write logic as pure functions wherever possible

State-update logic (each EventHandler / Controller / Command) is implemented as a
**pure function that takes an input state and returns a new state**.

```ts
execute: (state: CanvasState) => CanvasState; // no side effects
```

### Why

To make testing easy. With pure functions, you can directly verify
"input state → expected output state" without going through the DOM or a browser.
This is also the foundation that lets the unit and integration tests in
[Testing](./09-testing.md) run entirely in a node environment.

## 3. Each event handler is responsible for updating the entire canvas state

For a single gesture (e.g., a drag), the responsible EventHandler **returns the next
state of the entire `CanvasState`**. Selection, movement, snapping, history flags, and
any other changes the gesture triggers are all assembled in one place.

### Why

A structure that "splits update responsibility per state field" (e.g., separate
owners for selection, movement, and snapping each applying partial updates) tends to
break down in an application like this that handles diverse, interdependent state.
An update to one field can invalidate the assumptions of another, and the adjustment
code needed to keep things consistent ends up scattered. By assembling the whole
transition at the handler level, dependencies between pieces of state are resolved
right where they arise.

For details, see [State Update Flow (Reducer)](./06-state-update-flow.md).

## 4. Reject invalid state at the external-input boundary; internal functions assume validity

**Invalid state** such as circular references, broken references, and type mismatches
**is rejected at the boundary that receives external input**. Data that has passed the
boundary is assumed to be valid, so internal functions omit defensive checks.

The boundary is the parser (the two-stage validation of a `createCanvasParser` parser), and it is
the host's responsibility (VSCode extension, web app, etc.) to route external input
through it before passing it to `Canvas`. `SYNC_EXTERNAL` / `canvasToState`
(initial mount, external sync, and Undo/Redo restoration) assume they receive an
already-validated `CanvasDoc`, so they **do not re-validate**; `canvasToState` simply
maps it into state cheaply
→ [Data Model and Persistence](./03-data-model-and-persistence.md).

### Why

Performing duplicated validity checks in many places adds cost to high-frequency
internal processing (Principle 1). By centralizing validation at the boundary, the
internals can be written cheaply on the assumption that "only valid state ever arrives."

> **Status**: The defensive checks that used to be scattered throughout the internals
> (cycle guards for the tree structure, re-validation of referential integrity,
> silently swallowing missing IDs, and so on) have been removed, and internal functions
> are written on the assumption that "only valid state ever arrives."
>
> **Where the boundary lives**: The validation boundary is centralized in the parser
> (`createCanvasParser`), and `Canvas` does not re-validate. Routing the `CanvasDoc` passed
> to `Canvas` through the parser is **the host's responsibility**
> (→ see the comment on the `doc` prop in `Canvas.tsx`), and not re-validating at
> the entry point of `SYNC_EXTERNAL` / `canvasToState` is an **intentional design decision**
> to avoid redundant validation. Because `Canvas` relies on the contract that it is handed
> a validated doc, the host must always route input through its parser.
>
> **CSS injection** (stroke / fill / fontColor / fontFamily / fontWeight) is handled at the
> boundary under the same policy. The doc path is rejected by `isCssSafeValue` in
> `validateDocUtils`, and the clipboard path by state validation
> (`validateStateUtils` / `isCssColor`). No sink-side defense is added on the presentation
> (emotion styled) side, as it would be redundant.
