import type {
	TextSlot,
	TextSlotStyle,
} from "@jiscribe/doc/model/objects/types/text/TextSlot";

import { resolveTextSlotIds } from "./utils/resolveTextSlotIds";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { TextSlots } from "../../../states/objects/types/TextSlots";
import { textSlotsOf } from "../../utils/textSlotsOf";
import type { StyleEntry } from "../StyleEntry";

/**
 * The pair for an intent stored on whole slots: `writeSlot` decides what one
 * slot's write does, and the rest — which slots are reached (resolveTextSlotIds), the same-reference
 * contract, and reading each of them through the type's defaults — is shared by
 * every such intent (slotFieldEntry, and the whole-slot half of
 * runOrSlotEntry).
 *
 * @param field - The slot field written and read; one the text-style defaults answer for
 * @param writeSlot - One slot with the value reflected in it; copies the slot it is given rather than rebuilding it, so a type's own extra slot fields survive (TextSlots)
 * @returns The pair, writing every addressed slot and reporting one value per slot
 * @template TState - The state the entry is written against
 * @template V - The intent's value type; `field` is expected to carry it
 */
export const slotEntry = <TState extends ObjectState, V>(
	field: keyof TextSlotStyle,
	writeSlot: (slot: TextSlot, value: V) => TextSlot,
): StyleEntry<TState, V> => ({
	apply: (object, pick, value, ctx) => {
		const slots = textSlotsOf(object);
		if (slots === undefined) {
			return null;
		}
		const textSlotIds = resolveTextSlotIds(object, pick, ctx);
		if (textSlotIds.length === 0) {
			return null;
		}
		const updatedSlots: TextSlots = { ...slots };
		let changed = false;
		for (const slotId of textSlotIds) {
			const slot = slots[slotId];
			if (slot === undefined) {
				continue;
			}
			const updatedSlot = writeSlot(slot, value);
			if (updatedSlot === slot) {
				continue;
			}
			updatedSlots[slotId] = updatedSlot;
			changed = true;
		}
		return changed ? ({ ...object, text: updatedSlots } as TState) : object;
	},
	read: (object, pick, ctx) => {
		const slots = textSlotsOf(object);
		if (slots === undefined) {
			return [];
		}
		const values: V[] = [];
		for (const slotId of resolveTextSlotIds(object, pick, ctx)) {
			const slot = slots[slotId];
			if (slot === undefined) {
				continue;
			}
			// A field neither the slot nor its type's defaults set stays absent, and
			// is reported as the value it is: the reader's own last resort
			// (TEXT_STYLE_FALLBACK) is what such a slot is drawn with, and two slots
			// leaving it unset agree rather than disagreeing.
			values.push(
				ctx.textStyleDefaults.resolveSlotStyle(object.type, slotId, slot)[
					field
				] as V,
			);
		}
		return values;
	},
});
