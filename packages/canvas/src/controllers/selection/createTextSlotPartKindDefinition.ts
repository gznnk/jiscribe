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

/** hasOwnProperty rather than a lookup: "toString" names an Object.prototype member on every slot map, and a slot is not that. */
const holdsSlot = (slots: TextSlots | undefined, partId: string): boolean =>
	slots !== undefined && Object.prototype.hasOwnProperty.call(slots, partId);

/**
 * The `textSlot` part definition every `features.text === "slots"` type gets,
 * with part ids spelled as the keys of the object's own `text` — the id half of
 * the `data-part` its slot elements carry (textSlotPart). Nothing in it is
 * per-type but the text region, which is why applyObjectDefinition registers it
 * without the type saying anything.
 *
 * @param textRegion - The type's own `ObjectTypeDefinition.textRegion`;
 *   undefined for a type that registers none, whose slots then each take the
 *   whole box (the fallback calcTextRegion applies). Passing the definition's
 *   calculator keeps the outlined box the very one the renderer and the text
 *   editor place the body in
 * @returns A definition to register under {@link TEXT_SLOT_PART_KIND}, where it
 *   replaces the automatic registration when a type puts it in its own
 *   `ObjectTypeDefinition.partKinds`
 */
export const createTextSlotPartKindDefinition = (
	textRegion: ObjectTextRegionCalculator | undefined,
): ObjectPartKindDefinition => ({
	kind: TEXT_SLOT_PART_KIND,

	has: (object, partId) => holdsSlot(readSlots(object), partId),

	// The key order is the order the type stacks its slots in (see the mappers),
	// which is what Tab walks and a range runs along.
	list: (object) => Object.keys(readSlots(object) ?? {}),

	region: (object, partId) => {
		if (!holdsSlot(readSlots(object), partId) || !isTransformedFrame(object)) {
			return null;
		}
		return calcTextRegion(object, partId, textRegion);
	},
});
