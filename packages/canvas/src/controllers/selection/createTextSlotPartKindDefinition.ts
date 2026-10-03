import { isTransformedFrame } from "@jiscribe/geometry";

import type { ObjectPartKindDefinition } from "./ObjectPartKindRegistry";
import { TEXT_SLOT_PART_KIND } from "./textSlotPartKind";
import type { ObjectTextRegionCalculator } from "../../rendering/objects/registry/ObjectTextRegionRegistry";
import { calcTextRegion } from "../../rendering/objects/utils/calcTextRegion";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isTextStyleState } from "../../states/objects/base/TextStyleState";
import type { TextSlots } from "../../states/objects/types/TextSlots";

/** The object's slots, or undefined when it carries no keyed text at all. */
const readSlots = (object: ObjectState): TextSlots | undefined =>
	isTextStyleState(object) ? object.text : undefined;

/**
 * The `textSlot` part definition every `features.text === "slots"` type gets,
 * with part ids spelled as the keys of `state.text` — the same ids the slot
 * elements already carry in their `data-part`. Registered generically from
 * `applyObjectDefinition`, so a type declares nothing to take part in slot
 * selection.
 *
 * @param textRegion - The type's own `ObjectTypeDefinition.textRegion`;
 *   undefined for a type that registers none, whose slots then each take the
 *   whole box (the fallback `calcTextRegion` applies). Passing the definition's
 *   calculator rather than looking one up keeps the outlined box the very one
 *   the renderer and the text editor place the body in
 * @returns A definition to register under {@link TEXT_SLOT_PART_KIND}, where it
 *   replaces the automatic registration when a type puts it in its own
 *   `ObjectTypeDefinition.partKinds`
 */
export const createTextSlotPartKindDefinition = (
	textRegion: ObjectTextRegionCalculator | undefined,
): ObjectPartKindDefinition => ({
	kind: TEXT_SLOT_PART_KIND,

	// hasOwnProperty rather than a lookup: "toString" names an
	// Object.prototype member on every slot map, and a slot is not that.
	has: (object, partId) => {
		const slots = readSlots(object);
		return (
			slots !== undefined && Object.prototype.hasOwnProperty.call(slots, partId)
		);
	},

	// The key order is the order the type stacks its slots in, which is what Tab
	// walks and what a shift-extended range falls back to (see the mappers, and
	// ObjectPartKindDefinition.range for a type whose slots do not lie in one line).
	list: (object) => Object.keys(readSlots(object) ?? {}),

	region: (object, partId) => {
		const slots = readSlots(object);
		if (
			slots === undefined ||
			!Object.prototype.hasOwnProperty.call(slots, partId) ||
			!isTransformedFrame(object)
		) {
			return null;
		}
		return calcTextRegion(object, partId, textRegion);
	},

	// The identity: these part ids are slot ids already, which is what spares the
	// slot rules a special case for this kind (resolveSelectedTextSlotIds).
	textSlotIds: (_object, partIds) => partIds,
});
