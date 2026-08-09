import { requireObjects } from "./objectAccess";
import type { DocDefinitions } from "./objectGeometry";
import { applyRotation, requireRotationDegrees } from "./transformFields";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";

export type SetRotationResult = {
	/** Ids whose object took the angle. */
	rotatedIds: string[];
	/** Ids left as they were, their type having no rotation of its own. */
	ignoredIds: string[];
};

/**
 * Turn several objects to the same angle, mutating `doc` in place.
 *
 * The shape turns about its own centre and keeps that centre, so a rotated object still
 * measures the same untransformed bounding box to `getObjectsBounds` and still moves by the
 * placement ops. A type that cannot be turned is skipped rather than written, the way
 * {@link import("./setStyle").setStyle} skips a property a type has no place for, and every
 * such id is reported.
 *
 * @param doc - Mutated in place
 * @param ids - Ids to turn; all must exist in the root tree, and a duplicate id is reported twice
 * @param rotation - Clockwise degrees on screen, where y grows downwards; normalized to
 *   [0, 360), so -90 and 270 are the same angle and 0 clears the rotation
 * @param definitions - Type table `features.transform` is read from
 * @returns Which ids were turned, and which were left alone for having no rotation
 * @throws {@link DocOperationError} for an angle that is not finite, and naming every id that
 *   was not found — in both cases before anything is written
 */
export const setRotation = (
	doc: CanvasDoc,
	ids: readonly string[],
	rotation: number,
	definitions: DocDefinitions,
): SetRotationResult => {
	const degrees = requireRotationDegrees(rotation);
	const locations = requireObjects(doc, ids);
	const result: SetRotationResult = { rotatedIds: [], ignoredIds: [] };

	for (const { object } of locations) {
		const applied = applyRotation(
			object,
			degrees,
			definitions.get(object.type),
		);
		if (applied) {
			result.rotatedIds.push(object.id);
		} else {
			result.ignoredIds.push(object.id);
		}
	}
	return result;
};
