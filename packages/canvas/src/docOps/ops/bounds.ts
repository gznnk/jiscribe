import type { Rect } from "@jiscribe/geometry";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import {
	type ObjectRecord,
	requireObject,
	requireObjects,
} from "../utils/objectAccess";
import {
	type DocDefinitions,
	getObjectBounds as measureObjectBounds,
	unionBounds,
} from "../utils/objectGeometry";

/**
 * Axis-aligned box one object occupies, in world coordinates — the same top-left form
 * `addObject` takes and `moveObject` writes back. Rotation is ignored: `rotation` turns the
 * shape around its own centre, and the box measured here is the untransformed one every
 * placement op works on.
 *
 * @param doc - Searched but not modified
 * @param id - Id to measure, looked up anywhere in the tree; unlike the null return, a
 *   missing id is an error
 * @param definitions - Type table `features.geometry` is read from
 * @returns The box, or null for an object that cannot be measured: a connector (it follows
 *   the objects it joins), a group holding nothing, and a type this instance does not know
 * @throws {@link DocOperationError} when no object carries the id
 */
export const getObjectBounds = (
	doc: CanvasDoc,
	id: string,
	definitions: DocDefinitions,
): Rect | null =>
	measureObjectBounds(requireObject(doc, id).object, definitions);

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
			const bounds = measureObjectBounds(object, definitions);
			return bounds === null ? [] : [bounds];
		}),
	);
};
