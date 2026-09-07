> 🌐 日本語版: [07-external-sync.ja.md](./07-external-sync.ja.md)

# External Sync / VSCode Integration

When the canvas runs as a VSCode extension Webview, it synchronizes bidirectionally
with the file contents held by the host (the extension side). This document explains
how "host → canvas" ingestion works, and how conflicts that arise from the
round-trip of "canvas → host" saves are handled.

## Ingestion: useSyncExternalDoc / SYNC_EXTERNAL

The parent (host) passes the latest `CanvasDoc` in via Props. `useSyncExternalDoc`
(`controllers/hooks/useSyncExternalDoc.ts`) detects that change, converts it to
State with `canvasToState`, and dispatches `SYNC_EXTERNAL`.

Skip conditions:

- **Initial mount**: The reducer's initialization already used the same doc, so this is skipped
  (dispatching here would produce a redundant history entry).
- **Doc with identical content**: `isSameCanvasDocContent` compares against the current `history.present`,
  and if they are identical the sync is skipped. This avoids aborting an in-progress gesture, clearing UI state, or creating a meaningless history entry.

Before ingestion, `resetGestureState()` discards any in-progress gesture.

For how the reducer handles `SYNC_EXTERNAL` (pushing `past` directly as a history boundary,
resetting selection and in-progress operations while preserving only the viewport),
see [State Update Flow](./06-state-update-flow.md).

## Loading Another Document: docLoadId / LOAD_DOCUMENT

`SYNC_EXTERNAL` pushes onto `past` — it keeps the history — so putting **another
document** through that same path leaves the next Ctrl+Z restoring the previous
document's contents under the current document's name. The host declares which load
the doc currently in `doc` came from through the `docLoadId` prop. The value is any
string it likes (a path, or a counter bumped per load), changed only when another
document is put on the canvas; it stays as it is for an external edit to the same
document, and for the host re-sending the same doc after its own undo/redo.

`useSyncExternalDoc` checks `docLoadId` first. When it has changed, `LOAD_DOCUMENT`
is dispatched and the reducer adopts the doc with `past` and `future` dropped.
Neither the self-save fold-back check nor the identical-content skip runs on that
path: once the host has declared a load, the history has to go even if the contents
read the same. A host that passes no prop keeps the previous behaviour (every doc is
a `SYNC_EXTERNAL`).

Because docs coming from external sources cannot be trusted, they should ideally pass through
the parser's two-stage validation at the boundary
(see [Data Model and Persistence](./03-data-model-and-persistence.md) and [Design Philosophy](./01-design-philosophy.md), Principle 4).

## Save Notification: useNotifySaveRequest

When a commit (commit / undo / redo) advances `saveVersion`, `useNotifySaveRequest`
(`controllers/hooks/useNotifySaveRequest.ts`) notifies the parent via `onCommit(doc, saveNonce)`.
Because this effect depends only on `saveVersion`, it captures in a closure the **state of the very
render in which `saveVersion` incremented** (i.e., the state that should be persisted). `onCommit` is
invoked through a ref so that it does not re-fire even when the parent passes a new function on every render.

## Identifying Fold-Backs with saveNonce (#29)

The problem: the canvas saves → the host rewrites the file → that change is **echoed back to the
canvas itself** as `doc`. If this were treated as an ordinary external change, the operation
the canvas just performed would be re-pushed as a history boundary, and the UI state would be reset.

The solution: on save, issue a `saveNonce` and pass it via `onCommit`; the host returns it unchanged
as `syncNonce`. Matching is done against a **set of undelivered nonces** held by
`useSelfSaveNonceTracker` (`controllers/utils/createSelfSaveNonceTracker.ts`):

- `useNotifySaveRequest` `register`s each nonce it delivers.
- `useSyncExternalDoc` checks a fold-back's `syncNonce` with `consumeIfSelfSave`; on a match
  (a fold-back of our own save) it is **dropped without dispatching**. The echo carries no new
  information — the canvas is the source of truth — so nothing is updated (and no in-progress
  gesture is interrupted).
- An unregistered nonce (a genuine external change) dispatches `SYNC_EXTERNAL`, and the reducer
  processes it as a history boundary (push onto `past`, reset UI state).

Holding a set rather than a single value is the point. When saves overlap and their fold-backs
return out of order (e.g. a remote FS), a single last-nonce field would already be overwritten by a
later commit's nonce, so the earlier fold-back would be misclassified as external. Retaining the last
≤64 nonces makes classification robust to reordering.
