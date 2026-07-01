import type { Point } from "@workspace/geometry";

import { shapeFactoryRegistry } from "../../registry/ShapeFactoryRegistry";
import type { ObjectDoc } from "../base/ObjectDoc";
import type { ObjectType } from "../types/ObjectType";

/**
 * Creates an ObjectDoc from an ObjectType and a placement position.
 * `position` is the coordinate of the shape's center.
 *
 * Creation logic is delegated to each shape's `ShapeFactory` (`shapeFactoryRegistry`).
 * This file is a thin facade with no per-type switch.
 *
 * @param type - The shape type to create
 * @param position - Placement position (center-based coordinate)
 * @param overrides - Overrides for the default values
 * @returns The created ObjectDoc
 */
export const createObjectDoc = (
	type: ObjectType,
	position: Point,
	overrides?: Record<string, unknown>,
): ObjectDoc => {
	const factory = shapeFactoryRegistry.get(type);
	if (!factory) {
		throw new Error(`Unsupported object type for menu: ${type}`);
	}
	return factory.createDoc(position, overrides);
};
