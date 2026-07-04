import { canvasToDoc } from "./CanvasMapper";
import type { CanvasState } from "./CanvasState";
import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";

/**
 * The slice of CanvasState a snapshot needs to rebuild its CanvasDoc later.
 * Holding these references is safe because every state update path replaces
 * objects immutably; the committed map can never change under the snapshot.
 */
export type DocSnapshotSource = Pick<CanvasState, "objects" | "rootIds">;

/**
 * A history entry whose CanvasDoc is materialized lazily.
 *
 * Rebuilding the Doc tree (`canvasToDoc`) is O(N) over all objects, which is
 * too expensive to run on every commit during key-repeat nudges. Instead the
 * history stack stores either an already-resolved Doc or a reference to the
 * committed state, and `resolveDocSnapshot` converts on first read only.
 *
 * Invariant: neither ObjectState contents nor a resolved Doc may ever be
 * mutated in place — mappers share inner arrays (e.g. Poly `points`) by
 * reference between the two representations.
 */
export type DocSnapshot = {
	/** Resolved Doc (memoized). null until first resolution. */
	doc: CanvasDoc | null;
	/** Committed-state references for lazy conversion. null once resolved (or when created from a Doc). */
	source: DocSnapshotSource | null;
};

/** Creates a snapshot from a committed state; the Doc is built lazily on first resolve. */
export const createDocSnapshotFromState = (
	source: DocSnapshotSource,
): DocSnapshot => ({
	doc: null,
	source: { objects: source.objects, rootIds: source.rootIds },
});

/** Wraps an existing Doc (e.g. the initial document) as an already-resolved snapshot. */
export const createDocSnapshotFromDoc = (doc: CanvasDoc): DocSnapshot => ({
	doc,
	source: null,
});

/**
 * Returns the snapshot's CanvasDoc, converting from the stored state on first
 * call. Memoizes by mutating the snapshot in place — a write-once, idempotent
 * cache fill (`canvasToDoc` is pure), so calling it from a reducer or a
 * double-invoked StrictMode render is harmless.
 */
export const resolveDocSnapshot = (snapshot: DocSnapshot): CanvasDoc => {
	if (snapshot.doc !== null) {
		return snapshot.doc;
	}
	// A snapshot always holds either doc or source; source is non-null here.
	const resolvedDoc = canvasToDoc(snapshot.source as DocSnapshotSource);
	snapshot.doc = resolvedDoc;
	snapshot.source = null;
	return resolvedDoc;
};
