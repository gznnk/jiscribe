import { shapeFactoryRegistry } from "../../registry/ShapeFactoryRegistry";
import type { ObjectDoc } from "../base/ObjectDoc";
import type { DocCreationDefaults } from "../types/DocCreationDefaults";
import type { ObjectType } from "../types/ObjectType";

/**
 * Create an object Doc from the start and end points of a draw drag.
 * Returns null if the size is below the minimum, or the shape does not support
 * bounds-based drawing.
 *
 * The creation logic is delegated to each shape's `ShapeFactory.createDocFromBounds`.
 */
export const createObjectDocFromBounds = (
	type: ObjectType,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	overrides?: Record<string, unknown>,
	minSize = 5,
	docDefaults?: DocCreationDefaults,
): ObjectDoc | null => {
	const factory = shapeFactoryRegistry.get(type);
	if (!factory?.createDocFromBounds) {
		return null;
	}
	return factory.createDocFromBounds(
		x1,
		y1,
		x2,
		y2,
		overrides,
		minSize,
		docDefaults,
	);
};
