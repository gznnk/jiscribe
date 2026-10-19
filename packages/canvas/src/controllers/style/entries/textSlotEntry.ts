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
 * every such intent (textSlotFieldEntry, and the whole-slot halves of
 * runOrTextSlotEntry and textDecorationLineEntry).
 *
 * @param field - The slot field read when `readSlot` is omitted; one the text-style defaults answer for
 * @param writeSlot - One slot with the value reflected in it, handed the slot's styling resolved through its type's defaults as well; copies the slot it is given rather than rebuilding it, so a type's own extra slot fields survive (TextSlots), and returns that very slot when nothing changes
 * @param readSlot - The values one slot reports, handed it with its resolved styling; omitted, the resolved `field` alone
 * @returns The pair, writing every addressed slot and reporting what each of them reads in slot order
 * @template TState - The state the entry is written against
 * @template V - The intent's value type; `field` is expected to carry it
 */
export const textSlotEntry = <TState extends ObjectState, V>(
	field: keyof TextSlotStyle,
	writeSlot: (
		slot: TextSlot,
		value: V,
		resolvedStyle: TextSlotStyle,
	) => TextSlot,
	// A field neither the slot nor its type's defaults set stays absent, and is
	// reported as the value it is: the reader's own last resort
	// (TEXT_STYLE_FALLBACK) is what such a slot is drawn with, and two slots
	// leaving it unset agree rather than disagreeing.
	readSlot: (slot: TextSlot, resolvedStyle: TextSlotStyle) => readonly V[] = (
		_slot,
		resolvedStyle,
	) => [resolvedStyle[field] as V],
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
			const updatedSlot = writeSlot(
				slot,
				value,
				ctx.textStyleDefaults.resolveTextSlotStyle(object.type, slotId, slot),
			);
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
			values.push(
				...readSlot(
					slot,
					ctx.textStyleDefaults.resolveTextSlotStyle(object.type, slotId, slot),
				),
			);
		}
		return values;
	},
});
