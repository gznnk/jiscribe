import type { Point } from "@workspace/geometry";

import type { ObjectFactoryRegistry } from "../../registry/ObjectFactoryRegistry";
import type { ObjectDoc } from "../base/ObjectDoc";
import type { DocCreationDefaults } from "../types/DocCreationDefaults";
import type { ObjectType } from "../types/ObjectType";

/**
 * Creates an ObjectDoc from an ObjectType and a placement position.
 * `position` is the coordinate of the shape's center.
 *
 * Creation logic is delegated to each object type's `ObjectFactory`, resolved from
 * the caller-supplied `objectFactory` registry (no global state, so this stays pure).
 * This file is a thin facade with no per-type switch.
 *
 * @param type - The object type to create
 * @param position - Placement position (center-based coordinate)
 * @param objectFactory - The canvas's object factory registry
 * @param overrides - Overrides for the default values
 * @param docDefaults - Theme-derived creation defaults (e.g. fontFamily)
 * @returns The created ObjectDoc
 */
export const createObjectDoc = (
	type: ObjectType,
	position: Point,
	objectFactory: ObjectFactoryRegistry,
	overrides?: Record<string, unknown>,
	docDefaults?: DocCreationDefaults,
): ObjectDoc => {
	const factory = objectFactory.get(type);
	if (!factory) {
		throw new Error(`Unsupported object type: ${type}`);
	}
	return factory.createDoc(position, overrides, docDefaults);
};
