import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { readTextMeasurementGeneration } from "@jiscribe/doc/text/measure/textMeasurementSlot";

import { canvasToDoc } from "../../states/canvas/CanvasMapper";
import type { ObjectMapperRegistry } from "../../states/registry/ObjectMapperRegistry";
import type { DocSnapshot, DocSnapshotSource } from "../CanvasTypes";

/**
 * Creates a history entry from a committed state, stamped with the text
 * measurement generation its boxes were measured under.
 *
 * @param source - The committed state; only the fields a snapshot holds are
 *   kept, so the rest of the controller state is not retained by history
 * @param doc - The Doc this state was loaded from, kept verbatim as the entry's
 *   cache (the initial document); omitted, the Doc is built on first resolve
 */
export const createDocSnapshotFromState = (
	source: DocSnapshotSource,
	doc: CanvasDoc | null = null,
): DocSnapshot => ({
	source: {
		objects: source.objects,
		rootIds: source.rootIds,
		background: source.background,
		view: source.view,
		opaqueObjects: source.opaqueObjects,
	},
	textMeasurementGeneration: readTextMeasurementGeneration(),
	doc,
});

/**
 * The entry as it is to be held once it leaves `present`: without its Doc
 * cache, so the past and future stacks hold state only. A new object rather
 * than a write, because the entry being left is still the present of the
 * state it was taken from.
 *
 * @returns The same entry when it holds no cache; otherwise a copy with `doc`
 *   null, sharing `source` (which is what keeps a history mark pinned to it)
 */
export const dropDocCache = (snapshot: DocSnapshot): DocSnapshot =>
	snapshot.doc === null ? snapshot : { ...snapshot, doc: null };

/**
 * Returns the snapshot's CanvasDoc, converting from the stored state on first
 * call. Memoizes by mutating the snapshot in place — a write-once, idempotent
 * cache fill (`canvasToDoc` is pure), so calling it from a reducer or a
 * double-invoked StrictMode render is harmless. The cache is only ever dropped
 * by replacing the entry (dropDocCache), never by writing to it.
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
	const resolvedDoc = canvasToDoc(snapshot.source, mapper);
	snapshot.doc = resolvedDoc;
	return resolvedDoc;
};
