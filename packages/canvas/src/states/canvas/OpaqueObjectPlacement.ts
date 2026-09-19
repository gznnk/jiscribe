import type { OpaqueObjectDoc } from "@jiscribe/doc/model/objects/base/OpaqueObjectDoc";

/**
 * Where an opaque object sat in one container when the document was loaded: the
 * container, and the known objects in it that were drawn before it.
 */
export type OpaqueObjectAnchor = {
	/** The group holding it; undefined for the root. */
	parentId: string | undefined;
	/**
	 * Ids of the objects this canvas holds in `objects` that the container held
	 * at load, in drawing order. Shared by every anchor into the same container.
	 */
	loadedSiblingIds: readonly string[];
	/** How many of `loadedSiblingIds` were drawn before it; 0 = at the back. */
	precedingCount: number;
};

/**
 * An object the canvas holds without understanding it (see
 * {@link OpaqueObjectDoc}), kept aside from `objects` so nothing that draws,
 * hit-tests, selects or edits ever meets it, and put back in its place when the
 * state becomes a document again (`canvasToDoc`).
 */
export type OpaqueObjectPlacement = {
	/** The object exactly as the document holds it. */
	doc: OpaqueObjectDoc;
	/**
	 * Where it goes back, innermost first: its own container, then the one
	 * holding that group, out to the root, which is always last. The first whose
	 * container still exists is used, so an object whose group was ungrouped or
	 * deleted around it lands where the group was rather than being lost.
	 */
	anchors: readonly OpaqueObjectAnchor[];
};
