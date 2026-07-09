import type { Point } from "@workspace/geometry";

import type { ShapeFactoryRegistry } from "../../registry/ShapeFactoryRegistry";
import type { ObjectDoc } from "../base/ObjectDoc";
import type { DocCreationDefaults } from "../types/DocCreationDefaults";
import type { ObjectType } from "../types/ObjectType";

/**
 * Creates an ObjectDoc from an ObjectType and a placement position.
 * `position` is the coordinate of the shape's center.
 *
 * Creation logic is delegated to each shape's `ShapeFactory`, resolved from the
 * caller-supplied `shapeFactory` registry (no global state, so this stays pure).
 * This file is a thin facade with no per-type switch.
 *
 * @param type - The shape type to create
 * @param position - Placement position (center-based coordinate)
 * @param shapeFactory - The canvas's shape factory registry
 * @param overrides - Overrides for the default values
 * @param docDefaults - Theme-derived creation defaults (e.g. fontFamily)
 * @returns The created ObjectDoc
 */
export const createObjectDoc = (
	type: ObjectType,
	position: Point,
	shapeFactory: ShapeFactoryRegistry,
	overrides?: Record<string, unknown>,
	docDefaults?: DocCreationDefaults,
): ObjectDoc => {
	const factory = shapeFactory.get(type);
	if (!factory) {
		throw new Error(`Unsupported object type for menu: ${type}`);
	}
	return factory.createDoc(position, overrides, docDefaults);
};
