import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../../states/objects/base/TextStyleState";
import {
	getFirstTextSlotId,
	readTextSlot,
	writeTextSlot,
} from "../../../states/objects/types/TextSlots";
import type { StyleEntry } from "../StyleEntry";

/**
 * The text *content* of a shape, for the programmatic route a host has to it
 * (`onPropertyUpdate` / `set:text:…`) rather than for anything the canvas's own
 * menus offer.
 *
 * It lands on the default slot — the first key, the same slot Enter-started
 * editing opens — through `writeTextSlot`, so the other slots, the key order, the
 * slot's styling and its content kind (rows split on "\n") all survive. The slot
 * picked below the object has no say: the content is the shape's, and only its
 * styling follows a pick (defaultSlotsOf).
 *
 * The descendants of a selected group are written too, the content being as much
 * theirs as the selected shape's.
 */
export const textContentEntry: StyleEntry<ObjectState, string> = {
	apply: (object, _pick, text) => {
		const slots = (object as ObjectState & TextStyleState).text;
		const slotId = getFirstTextSlotId(slots);
		if (slots === undefined || slotId === undefined) {
			return null;
		}
		return readTextSlot(slots, slotId) === text
			? object
			: ({
					...object,
					text: writeTextSlot(slots, slotId, text),
				} as ObjectState);
	},
	read: (object) => {
		const slots = (object as ObjectState & TextStyleState).text;
		const slotId = getFirstTextSlotId(slots);
		return slotId === undefined ? [] : [readTextSlot(slots, slotId)];
	},
};
