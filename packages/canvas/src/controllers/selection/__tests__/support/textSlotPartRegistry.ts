import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

import { createTextSlotPartKindDefinition } from "../../createTextSlotPartKindDefinition";
import { createObjectPartKindRegistry } from "../../ObjectPartKindRegistry";
import type { ObjectPartKindRegistry } from "../../ObjectPartKindRegistry";

/**
 * Declares the slot part for more types on a registry that already exists — the
 * bundle a test built with `createTestRegistries`, which knows the built-in
 * types alone and so has never seen a plugin's slotted shape.
 *
 * @param registry - The bundle's own ObjectPartKindRegistry, written in place
 * @param types - The object types to declare slots for, as applyObjectDefinition
 *   would for a `features.text === "slots"` definition
 */
export const registerTextSlotParts = (
	registry: ObjectPartKindRegistry,
	...types: ObjectType[]
): void => {
	for (const type of types) {
		registry.register(type, [createTextSlotPartKindDefinition(undefined)]);
	}
};

/**
 * A part registry holding the very slot definition applyObjectDefinition
 * registers for a `features.text === "slots"` type, for each named type. Tests
 * that only need a slot selection to resolve build one of these instead of a
 * whole canvas bundle.
 *
 * @param types - The object types to declare slots for; a type left out has no
 *   parts at all, which is how core sees a `features.text: "body"` shape
 * @returns A fresh registry, with no text-region calculator (so a slot's region
 *   is the object's whole box)
 */
export const createTextSlotPartRegistry = (
	...types: ObjectType[]
): ObjectPartKindRegistry => {
	const registry = createObjectPartKindRegistry();
	registerTextSlotParts(registry, ...types);
	return registry;
};
