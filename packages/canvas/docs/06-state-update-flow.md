> 🌐 日本語版: [06-state-update-flow.ja.md](./06-state-update-flow.ja.md)

# State Update Flow (Reducer)

Every update to `CanvasState` passes through `canvasReducer`
(`controllers/reducer/canvasReducer.ts`). This is where each gesture and command is
dispatched to a pure-function handler that returns the new state.
This "assemble the entire transition in one place" policy follows principle 3 of the
[Design Philosophy](./01-design-philosophy.md).

## Action List

`CanvasAction` (`controllers/reducer/CanvasActions.ts`) is the union of every action the reducer accepts;
what each action means is documented on its type in that file. The main actions and where they are delegated:

| Action                      | Role                                                                  | Delegates to                                                                                 |
| --------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `GESTURE`                   | Gestures originating from pointer/wheel input                         | `handleGesture` → [Gesture System](./04-gesture-system.md)                                   |
| `COMMAND`                   | Commands from shortcuts/menus/toolbar (incl. undo/redo)               | `handleCommand` → [Command System](./05-command-system.md)                                   |
| `PASTE`                     | Applying clipboard data                                               | `handlePaste`                                                                                |
| `STYLE_PROPERTY_UPDATE`     | Style input of the ObjectMenu / properties sidebar (preview / commit) | `StylePropertyRegistry.apply` → [Style Property System](./10-style-properties.md)            |
| `TRANSFORM_PROPERTY_UPDATE` | Properties sidebar frame-number input (preview / commit)              | `handleTransformPropertyUpdate` → the same resize / rotate utilities the transform drag uses |
| `DOCUMENT_PROPERTY_UPDATE`  | Properties sidebar Canvas section (preview / commit)                  | (inline) — writes `state.background`; `null` clears it and the host theme decides again      |
| `META_PROPERTY_UPDATE`      | Properties sidebar input for an object's `meta` (preview / commit)    | `handleMetaPropertyUpdate`                                                                   |
| `SYNC_EXTERNAL`             | Importing a doc from the external host                                | → [External Sync](./07-external-sync.md)                                                     |
| `LOAD_DOCUMENT`             | Loading another document (an import that drops history)               | → [External Sync](./07-external-sync.md)                                                     |
| `END_TEXT_EDIT`             | Committing / cancelling a text edit                                   | A commit goes to `commitTextEditIfNeeded`; a cancel just discards the edit state             |

Other actions only swap a piece of state inside the reducer, such as setting the camera or the selection, or
updating the draft during a text edit. `UPDATE_TEXT_EDIT`, for instance, only replaces the draft; the commit into
the doc happens when `END_TEXT_EDIT` commits.

Each handler (`handleGesture` / `handleCommand` / `handlePaste`, …) is implemented as a
**pure function** that returns the new state from the state and its input (plus the canvas's registry bundle),
with no side effects.
This is the foundation that lets unit and integration tests run entirely in a node
environment ([Testing](./09-testing.md)).

## History Recording (commitVersion)

A handler that produces a "change subject to persistence and undo" increments the
`commitVersion` of the resulting state. After the relevant action, `canvasReducer` calls
`recordHistoryIfNeeded`, which records history **if `commitVersion` has changed from the
previous state** (at the same time raising a save request: it advances `saveRequest`'s `version` and issues a
fresh `nonce`; see [External Sync / VSCode Integration](./07-external-sync.md)).

- For gestures, `handleGesture` advances `commitVersion` only when the doc actually
  changed on `dragEnd`. This prevents ghost undo entries from being created by drags that
  produce no doc change, such as "drawing was abandoned below the minimum size."
- `STYLE_PROPERTY_UPDATE` does not record history when `commit: false` (preview); it only
  advances `commitVersion` when `commit: true` (blur / Enter). The other property actions
  (`TRANSFORM_PROPERTY_UPDATE` and the like) go through the same commit tail (`commitPropertyUpdate`),
  so they behave identically.

History lives in `state.history` (`past` / `present` / `future`). `past` is trimmed to
the most recent 50 entries.

## Coalescing Consecutive Operations

To merge consecutive operations, such as repeated nudges with the arrow keys, into a
single undo entry, history recording has a coalescing mechanism.

- Each handler signals its intent that "this operation may be merged" by setting
  `state.historyCoalesce.pending` (the coalescing key).
- If the identifier of the previous commit (`recorded`) and `pending` are the **same key
  and within a fixed time window** (`HISTORY_COALESCE_WINDOW_MS = 1000ms`),
  `recordHistoryIfNeeded` replaces only `present` without growing `past`.
- The history layer consumes `pending` here and always resets it to `null`.

## SYNC_EXTERNAL and History Boundaries

External changes are treated as history boundaries. Rather than going through
`recordHistoryIfNeeded`, `past` is pushed directly (moving `present` into `past` and
setting the new doc as `present`), and `future` is cleared.
UI state such as selection and in-progress operations is also explicitly reset (only the
viewport is preserved).
Fold-backs of the canvas's own save are filtered out before reaching the reducer, so every
`SYNC_EXTERNAL` seen here is a genuine external change. For how fold-backs are identified, see
[External Sync / VSCode Integration](./07-external-sync.md).

Loading **another document** (`LOAD_DOCUMENT`) is the same adoption, except that
`past` is not pushed but dropped along with `future`: keeping the previous document's
entries would let an undo restore its contents under the new document's name.
