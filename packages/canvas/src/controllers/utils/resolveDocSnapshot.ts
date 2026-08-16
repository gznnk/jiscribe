import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import { canvasToDoc } from "../../states/canvas/CanvasMapper";
import type { ObjectMapperRegistry } from "../../states/registry/ObjectMapperRegistry";
import type { DocSnapshot, DocSnapshotSource } from "../CanvasTypes";

/** Creates a snapshot from a committed state; the Doc is built lazily on first resolve. */
export const createDocSnapshotFromState = (
	source: DocSnapshotSource,
): DocSnapshot => ({
	doc: null,
	source: {
		objects: source.objects,
		rootIds: source.rootIds,
		background: source.background,
	},
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
 *
 * `mapper` is only consulted on the first (unresolved) call; once a snapshot is
 * memoized the mapper is irrelevant, so passing the canvas's own mapper each
 * time is safe.
 */
export const resolveDocSnapshot = (
	snapshot: DocSnapshot,
	mapper: ObjectMapperRegistry,
): CanvasDoc => {
	if (snapshot.doc !== null) {
		return snapshot.doc;
	}
	// A snapshot always holds either doc or source; source is non-null here.
	const resolvedDoc = canvasToDoc(snapshot.source as DocSnapshotSource, mapper);
	snapshot.doc = resolvedDoc;
	snapshot.source = null;
	return resolvedDoc;
};
