import { normalizeAngleDeg } from "@workspace/geometry";

import { DocOperationError } from "./errors";
import type { ObjectRecord } from "./objectAccess";
import type { ObjectDocDefinition } from "../schemas/plugin/ObjectDocDefinition";

// The rotation field `setRotation` and `addObject` both write, checked and applied here so
// neither op restates the other's rules.

/**
 * Bring an angle into the range the doc stores, failing on a value that is not an angle.
 *
 * @param rotation - Degrees, clockwise, of any magnitude and sign
 * @returns The same angle within [0, 360)
 * @throws {@link DocOperationError} for NaN and for either infinity, which name no direction
 */
export const requireRotationDegrees = (rotation: number): number => {
	if (!Number.isFinite(rotation)) {
		throw new DocOperationError(
			`rotation must be a finite number of degrees, got ${rotation}`,
		);
	}
	return normalizeAngleDeg(rotation);
};

/**
 * Turn an object to a given angle, mutating it in place. Shared by `setRotation` and by
 * `addObject`, which turns what the factory just built.
 *
 * A type without `features.transform` — polygon, polyline, connector — has no rotation to
 * write, and is left alone rather than given a property its schema does not allow.
 *
 * @param object - Mutated in place
 * @param rotation - Degrees within [0, 360), as {@link requireRotationDegrees} returns; 0
 *   removes the property, since an absent rotation is the identity (TransformDoc 参照)
 * @param definition - The object's own definition, whose `features.transform` decides
 *   whether the angle applies
 * @returns Whether the angle was written
 */
export const applyRotation = (
	object: ObjectRecord,
	rotation: number,
	definition: ObjectDocDefinition | undefined,
): boolean => {
	if (definition?.features.transform !== true) {
		return false;
	}
	if (rotation === 0) {
		delete object.rotation;
	} else {
		object.rotation = rotation;
	}
	return true;
};
