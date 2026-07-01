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

Because docs coming from external sources cannot be trusted, they should ideally pass through
the parser's two-stage validation at the boundary
(see [Data Model and Persistence](./03-data-model-and-persistence.md) and [Design Philosophy](./01-design-philosophy.md), Principle 4).

## Save Notification: useNotifySaveRequest

When a commit (commit / undo / redo) advances `saveVersion`, `useNotifySaveRequest`
(`controllers/hooks/useNotifySaveRequest.ts`) notifies the parent via `onCommit(doc, saveNonce)`.
Because this effect depends only on `saveVersion`, it captures in a closure the **state of the very
render in which `saveVersion` incremented** (i.e., the state that should be persisted). `onCommit` is
invoked through a ref so that it does not re-fire even when the parent passes a new function on every render.

## Avoiding Round-Trip Conflicts with saveNonce (#29)

The problem: the canvas saves → the host rewrites the file → that change is **echoed back to the
canvas itself** as `canvasDoc`. If this were treated as an ordinary external change, the operation
the canvas just performed would be re-pushed as a history boundary, and the UI state would be reset.

The solution: on save, issue a `saveNonce` and pass it via `onCommit`; the host returns it unchanged
as the `saveNonce` of `SYNC_EXTERNAL`. The reducer then behaves as follows:

- `action.saveNonce === state.saveNonce` (echo-back of the canvas's own save)
  → Update only the object references; leave `past` / `future` (the history) unchanged.
- Not matching (a genuine external change)
  → Process it as a history boundary (push onto `past`, reset UI state).

This makes it possible to distinguish a self-save round-trip from a real external change.

> **Known issue (#29)**: A conflict at the moment when the saveNonce completes a full round-trip.
> Tracked as a boundary case of nonce issuance and matching.
> </content>
