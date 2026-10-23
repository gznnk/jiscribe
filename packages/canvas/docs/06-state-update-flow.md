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

| Action                      | Role                                                                            | Delegates to                                                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GESTURE`                   | Gestures originating from pointer/wheel input                                   | `handleGesture` → [Gesture System](./04-gesture-system.md)                                                                                                                                     |
| `COMMAND`                   | Commands from shortcuts/menus/toolbar (incl. undo/redo)                         | `handleCommand` → [Command System](./05-command-system.md)                                                                                                                                     |
| `PASTE`                     | Applying clipboard data                                                         | `handlePaste`                                                                                                                                                                                  |
| `STYLE_INTENT`              | One style edit stated by the ObjectMenu / properties sidebar (preview / commit) | `applyStyleIntent` → [Style System](./10-style-properties.md)                                                                                                                                  |
| `TRANSFORM_PROPERTY_UPDATE` | Properties sidebar frame-number input (preview / commit)                        | `handleTransformPropertyUpdate` → the same resize / rotate utilities the transform drag uses                                                                                                   |
| `DOCUMENT_PROPERTY_UPDATE`  | Properties sidebar Canvas section (preview / commit)                            | `applyDocumentProperty` — writes one field of `state.meta`, `state.background` or one part of `state.view` (normalized by `mergeViewDoc`); `null` drops the setting and the host decides again |
| `META_PROPERTY_UPDATE`      | Properties sidebar input for an object's `meta` (preview / commit)              | `handleMetaPropertyUpdate`                                                                                                                                                                     |
| `SYNC_EXTERNAL`             | Importing a doc from the external host                                          | → [External Sync](./07-external-sync.md)                                                                                                                                                       |
| `LOAD_DOCUMENT`             | Loading another document (an import that drops history)                         | → [External Sync](./07-external-sync.md)                                                                                                                                                       |
| `END_TEXT_EDIT`             | Committing / cancelling a text edit                                             | A commit goes to `commitTextEditIfNeeded`; a cancel just discards the edit state                                                                                                               |

Other actions only swap a piece of state inside the reducer, such as setting the camera or the selection, or
updating the draft during a text edit. `UPDATE_TEXT_EDIT`, for instance, only replaces the draft; the commit into
the doc happens when `END_TEXT_EDIT` commits, or when the editor's Ctrl/Cmd+Enter runs the `commitTextEdit`
command, which ends in the same state and the same undo entry.

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

- The writer that edits the document advances `commitVersion` itself (`commitEdit`),
  and only when it wrote: a drag writer on its `dragEnd`, a command in its `execute`,
  a click that edits on that click. `handleGesture`'s close-out (`dragEnd`, `click`,
  `doubleClick` — see [Gesture System](./04-gesture-system.md)) only flattens the
  copy-on-write view and drops the drag bookkeeping; it never advances the version.
  So a gesture that produces no doc change — a drawing abandoned below the minimum
  size, a click that merely moved the selection — leaves no ghost undo entry, and
  undo / redo, which restore a snapshot without advancing it, are not recorded as
  edits of their own.
- `STYLE_INTENT` does not record history when `commit: false` (preview); it only
  advances `commitVersion` when `commit: true` (blur / Enter). The other property actions
  (`TRANSFORM_PROPERTY_UPDATE` and the like) go through the same commit tail (`commitPropertyUpdate`),
  so they behave identically.

History lives in `state.history` (`past` / `present` / `future`). `past` is trimmed to
the most recent 50 entries.

### What an entry holds

Each entry (`DocSnapshot`) holds the committed state itself (`source`: `objects`,
`rootIds`, `background`, `view`, `opaqueObjects`), shared with the state that committed
it rather than copied. Undo, redo and revert hand that `source` back as is
(`restoreHistorySnapshot`), so an object the swap leaves alone keeps its identity: the
per-object caches downstream (memoized renders, connector routes, text layout) still hit,
and the settling passes after the swap compare by reference and only touch what changed.
The camera's reveal (`calcViewportToRevealHistoryChange`) diffs the two entries' committed
object maps by reference too, so boxes a re-measure renewed since do not read as changed.

- **The Doc is a cache of the present entry only.** `resolveDocSnapshot` builds it on first
  read (the save, the external-sync comparison) and memoizes it on the entry. An entry leaving
  `present` is replaced by a copy without it (`dropDocCache`), never written to, so past and
  future hold state only.
- **An entry the host's doc created keeps that doc.** The initial entry and those
  `SYNC_EXTERNAL` / `LOAD_DOCUMENT` create hold the host's doc verbatim (`openedDoc`) for
  their whole life, so undoing back to one saves the host's own bytes, and an echo of them
  is recognized as the same content.
- **An entry's identity is its `source`.** Dropping the cache yields a new entry object, so
  a history mark (`ref.current.history.mark()`) and `REVERT_HISTORY` pin the `source`.
- **Font generation.** Each entry records the text measurement generation it was created
  under. An entry restored after the generation moved on (a web font face finished loading)
  has its content-sized boxes re-measured, as `REMEASURE_TEXT` does for the live state. A
  resizer hands back the very object whose box did not move, so only the boxes the new faces
  change become new objects.

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
Objects the change leaves alone enter the new `present` as the same references (see
[External Sync / VSCode Integration](./07-external-sync.md)).
Fold-backs of the canvas's own save are filtered out before reaching the reducer, so every
`SYNC_EXTERNAL` seen here is a genuine external change. For how fold-backs are identified, see
[External Sync / VSCode Integration](./07-external-sync.md).

Loading **another document** (`LOAD_DOCUMENT`) is the same adoption, except that
`past` is not pushed but dropped along with `future`: keeping the previous document's
entries would let an undo restore its contents under the new document's name.
