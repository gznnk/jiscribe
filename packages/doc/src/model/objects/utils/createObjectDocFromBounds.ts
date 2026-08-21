import { DEFAULT_MIN_DRAW_SIZE } from "./calcDrawBounds";
import type { ObjectFactoryRegistry } from "../../../plugin/ObjectFactoryRegistry";
import type { ObjectDoc } from "../base/ObjectDoc";
import type { ObjectType } from "../types/ObjectType";

/**
 * Create an object Doc from the start and end points of a draw drag.
 * Returns null if the size is below the minimum, or the shape does not support
 * bounds-based drawing.
 *
 * The creation logic is delegated to each object type's `ObjectFactory.createDocFromBounds`,
 * resolved from the caller-supplied `objectFactory` registry (no global state).
 */
export const createObjectDocFromBounds = (
	type: ObjectType,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	objectFactory: ObjectFactoryRegistry,
	overrides?: Record<string, unknown>,
	minSize = DEFAULT_MIN_DRAW_SIZE,
): ObjectDoc | null => {
	const factory = objectFactory.get(type);
	if (!factory?.createDocFromBounds) {
		return null;
	}
	return factory.createDocFromBounds(x1, y1, x2, y2, overrides, minSize);
};
