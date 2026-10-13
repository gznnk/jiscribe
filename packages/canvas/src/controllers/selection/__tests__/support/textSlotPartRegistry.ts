import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

import { createObjectPartKindRegistry } from "../../../../rendering/objects/registry/ObjectPartKindRegistry";
import type { ObjectPartKindRegistry } from "../../../../rendering/objects/registry/ObjectPartKindRegistry";
import {
	createTextSlotPartKindDefinition,
	placeTextSlotRegions,
} from "../../partKinds/textSlotPartKind";

/**
 * Declares the slot part for more types on a registry that already exists — the
 * bundle a test built with `createTestRegistries`, which knows the built-in
 * types alone and so has never seen a plugin's slotted shape.
 *
 * @param registry - The bundle's own ObjectPartKindRegistry, written in place
 * @param types - The object types to declare slots for, as applyObjectDefinition
 *   would for a definition with `features.text`
 */
export const registerTextSlotParts = (
	registry: ObjectPartKindRegistry,
	...types: ObjectType[]
): void => {
	for (const type of types) {
		registry.register(type, [
			placeTextSlotRegions(type, createTextSlotPartKindDefinition()),
		]);
	}
};

/**
 * A part registry holding the very slot definition applyObjectDefinition
 * registers for a type with `features.text`, for each named type. Tests
 * that only need a slot selection to resolve build one of these instead of a
 * whole canvas bundle.
 *
 * @param types - The object types to declare slots for; a type left out has no
 *   parts at all, which is how core sees a type holding no text
 * @returns A fresh registry, whose kinds place no slot of their own (so a slot's
 *   region is the object's whole box)
 */
export const createTextSlotPartRegistry = (
	...types: ObjectType[]
): ObjectPartKindRegistry => {
	const registry = createObjectPartKindRegistry();
	registerTextSlotParts(registry, ...types);
	return registry;
};
