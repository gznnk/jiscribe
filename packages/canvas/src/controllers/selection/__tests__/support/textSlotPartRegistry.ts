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

/**
 * The kind standing for a group of slots in these fixtures, as a table's row
 * does over the cells of that row (plugins/table-shape).
 */
export const SLOT_GROUP_PART_KIND = "row";

/**
 * The kind naming something other than text, which covers no slot at all — a
 * callout's tail, a vertex.
 */
export const NON_SLOT_PART_KIND = "tail";

/**
 * Declares both of those beside the slot part, on one type. The group kind's ids
 * are row indices and it covers every slot whose id names that row, the cells
 * being keyed `r<row>c<column>` as a table keys them.
 *
 * @param registry - The registry to write in place; the type's parts are
 *   replaced, all three going in the one `register` call it takes
 * @param type - The object type to declare them for, which has to be one whose
 *   fixtures hold slots keyed that way
 */
export const registerSlotGroupParts = (
	registry: ObjectPartKindRegistry,
	type: ObjectType,
): void => {
	registry.register(type, [
		createTextSlotPartKindDefinition(undefined),
		{
			kind: SLOT_GROUP_PART_KIND,
			has: () => true,
			textSlotIds: (object, partIds) =>
				Object.keys(
					(object as unknown as { text: Record<string, unknown> }).text,
				).filter((slotId) =>
					partIds.some((rowIndex) => slotId.startsWith(`r${rowIndex}c`)),
				),
		},
		{ kind: NON_SLOT_PART_KIND, has: () => true },
	]);
};
