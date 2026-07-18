> 🌐 日本語版: [06-state-update-flow.ja.md](./06-state-update-flow.ja.md)

# State Update Flow (Reducer)

Every update to `CanvasState` passes through `canvasReducer`
(`controllers/reducer/canvasReducer.ts`). This is where each gesture and command is
dispatched to a pure-function handler that returns the new state.
This "assemble the entire transition in one place" policy follows principle 3 of the
[Design Philosophy](./01-design-philosophy.md).

## Action List

`CanvasAction` (`controllers/reducer/CanvasActions.ts`) is the following union.

| Action                               | Role                                                    | Delegates to                                                                      |
| ------------------------------------ | ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `GESTURE`                            | Gestures originating from pointer/wheel input           | `handleGesture` → [Gesture System](./04-gesture-system.md)                        |
| `COMMAND`                            | Commands from shortcuts/menus/toolbar (incl. undo/redo) | `handleCommand` → [Command System](./05-command-system.md)                        |
| `PASTE`                              | Applying clipboard data                                 | `handlePaste`                                                                     |
| `MENU_PROPERTY_UPDATE`               | ObjectMenu input (preview / commit)                     | `StylePropertyRegistry.apply` → [Style Property System](./10-style-properties.md) |
| `SYNC_EXTERNAL`                      | Importing a doc from the external host                  | → [External Sync](./07-external-sync.md)                                          |
| `CONTAINER_RESIZE`                   | Updating viewport dimensions                            | (inline)                                                                          |
| `UPDATE_TEXT_EDIT` / `END_TEXT_EDIT` | Updates during text editing / commit or cancel          | `commitTextEditIfNeeded`                                                          |
| `CLOSE_CONTEXT_MENU`                 | Simply closing the context menu                         | (inline)                                                                          |

Each handler (`handleGesture` / `handleCommand` / `handlePaste`, …) is implemented as a
**pure function of the form `(state) => state`** with no side effects.
This is the foundation that lets unit and integration tests run entirely in a node
environment ([Testing](./09-testing.md)).

## History Recording (commitVersion)

A handler that produces a "change subject to persistence and undo" increments the
`commitVersion` of the resulting state. After the relevant action, `canvasReducer` calls
`recordHistoryIfNeeded`, which records history **if `commitVersion` has changed from the
previous state** (advancing `saveVersion` at the same time).

- For gestures, `handleGesture` advances `commitVersion` only when the doc actually
  changed on `dragEnd`. This prevents ghost undo entries from being created by drags that
  produce no doc change, such as "drawing was abandoned below the minimum size."
- `MENU_PROPERTY_UPDATE` does not record history when `commit: false` (preview); it only
  advances `commitVersion` when `commit: true` (blur / Enter).

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
</content>
</invoke>
