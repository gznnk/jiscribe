import { normalizeAngleDeg } from "@jiscribe/geometry";

import { DocOperationError } from "../errors";
import type { ObjectRecord } from "./objectAccess";
import type { ObjectDocDefinition } from "../../plugin/ObjectDocDefinition";

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
 * Whether a rotation applies to a type at all, `false` naming the ones with no angle
 * to write (polygon, polyline, connector). {@link applyRotation} asks this before it
 * writes, and `addObject` before it hands the angle to a factory whose placement
 * depends on it (a point geometry's stored corner is a rotated one).
 *
 * @param definition - The object's own definition, or undefined for a type this build does not know, which takes no rotation either
 */
export const acceptsRotation = (
	definition: ObjectDocDefinition | undefined,
): boolean => definition?.features.transform === true;

/**
 * Turn an object to a given angle, mutating it in place. Shared by `setRotation` and by
 * `addObject`, which turns what the factory just built.
 *
 * A type without `features.transform` — polygon, polyline, connector — has no rotation to
 * write, and is left alone rather than given a property its schema does not allow.
 *
 * @param object - Mutated in place
 * @param rotation - Degrees within [0, 360), as {@link requireRotationDegrees} returns; 0
 *   removes the property, since an absent rotation is the identity (see TransformDoc)
 * @param definition - The object's own definition, whose `features.transform` decides
 *   whether the angle applies
 * @returns Whether the angle was written
 */
export const applyRotation = (
	object: ObjectRecord,
	rotation: number,
	definition: ObjectDocDefinition | undefined,
): boolean => {
	if (!acceptsRotation(definition)) {
		return false;
	}
	if (rotation === 0) {
		delete object.rotation;
	} else {
		object.rotation = rotation;
	}
	return true;
};
