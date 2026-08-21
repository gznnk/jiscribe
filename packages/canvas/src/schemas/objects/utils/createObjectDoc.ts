import type { Point } from "@jiscribe/geometry";

import type { ObjectFactoryRegistry } from "../../registry/ObjectFactoryRegistry";
import type { ObjectDoc } from "../base/ObjectDoc";
import type { ObjectType } from "../types/ObjectType";

/**
 * Creates an ObjectDoc from an ObjectType and a placement position.
 * `position` is the coordinate of the shape's center, except for point-geometry
 * types, which take it as the drawn top-left (see ObjectFactory.createDoc).
 *
 * Creation logic is delegated to each object type's `ObjectFactory`, resolved from
 * the caller-supplied `objectFactory` registry (no global state, so this stays pure).
 * This file is a thin facade with no per-type switch.
 *
 * @param type - The object type to create
 * @param position - Placement position, center-based for every geometry but `point`, whose doc stores it as the drawn top-left
 * @param objectFactory - The canvas's object factory registry
 * @param overrides - Overrides for the default values
 * @returns The created ObjectDoc
 */
export const createObjectDoc = (
	type: ObjectType,
	position: Point,
	objectFactory: ObjectFactoryRegistry,
	overrides?: Record<string, unknown>,
): ObjectDoc => {
	const factory = objectFactory.get(type);
	if (!factory) {
		throw new Error(`Unsupported object type: ${type}`);
	}
	return factory.createDoc(position, overrides);
};
