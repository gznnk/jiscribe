import type { Rect } from "@jiscribe/geometry";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import { type ObjectRecord, requireObjects } from "../utils/objectAccess";
import {
	type DocDefinitions,
	getObjectBounds,
	unionBounds,
} from "../utils/objectGeometry";

/**
 * Smallest axis-aligned box containing several objects, in world coordinates — where a
 * caller places new content beside what is already there. Rotation is ignored, as in
 * {@link getObjectBounds}.
 *
 * @param doc - Searched but not modified
 * @param ids - Ids to measure, each looked up anywhere in the tree; undefined measures
 *   every object in `doc.root`. Ids that contribute nothing are simply skipped, so a
 *   selection of connectors alone yields null rather than an error
 * @param definitions - Type table `features.geometry` is read from
 * @returns The union box, or null when nothing contributed: an empty doc, or objects that
 *   {@link getObjectBounds} cannot measure (connectors, empty groups, unknown types)
 * @throws {@link DocOperationError} naming every id in `ids` that was not found
 */
export const getObjectsBounds = (
	doc: CanvasDoc,
	ids: readonly string[] | undefined,
	definitions: DocDefinitions,
): Rect | null => {
	const targets =
		ids === undefined
			? (doc.root as ObjectRecord[])
			: requireObjects(doc, ids).map(({ object }) => object);
	return unionBounds(
		targets.flatMap((object) => {
			const bounds = getObjectBounds(object, definitions);
			return bounds === null ? [] : [bounds];
		}),
	);
};
