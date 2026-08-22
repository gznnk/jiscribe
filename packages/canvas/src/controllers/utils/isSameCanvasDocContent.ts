import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";

/**
 * Determines whether two CanvasDocs are identical in terms of rendered content.
 * $schema is excluded from the comparison: it is a retired, non-round-tripped
 * legacy field (see CanvasDoc.$schema), so it never reflects render state.
 *
 * Implemented as a JSON string comparison with a fixed key order. The top-level
 * key order is fixed here, but each object inside root (including connectors) is
 * serialized in its own key-insertion order, so docs with identical content but
 * a different key order can be judged as "different" (false negative). Because of
 * this, use it only for the optimization of "skip processing when judged
 * identical", never where strict equality is required.
 */
export function isSameCanvasDocContent(
	docA: CanvasDoc,
	docB: CanvasDoc,
): boolean {
	return stringifyDocContent(docA) === stringifyDocContent(docB);
}

const stringifyDocContent = (doc: CanvasDoc): string =>
	JSON.stringify({
		version: doc.version,
		background: doc.background,
		root: doc.root,
	});
