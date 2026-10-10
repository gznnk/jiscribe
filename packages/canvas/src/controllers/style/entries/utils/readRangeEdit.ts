import type { RichText } from "@jiscribe/doc/model/objects/types/text/RichText";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { TextSlots } from "../../../../states/objects/types/TextSlots";
import { readRichTextSlot } from "../../../../states/objects/types/TextSlots";
import { textSlotsOf } from "../../../utils/textSlotsOf";
import type { StyleContext } from "../../StyleEntry";

/** The stretch of one object's slot a per-range write or read acts on. */
export type RangeEdit = {
	slots: TextSlots;
	slotId: string;
	/** The slot's content as the editor draws it: a row-partitioned slot joined by "\n". */
	content: RichText;
	start: number;
	end: number;
};

/**
 * The stretch `ctx` names on this very object, or null when the whole slot is
 * what the edit means — no stretch is being edited, it belongs to another
 * object, or the slot it names is gone. The one answer to "is this a per-range
 * edit" for every entry that has to know (runOrSlotEntry,
 * toggleRunOrSlotEntry).
 *
 * @param object - The target, as the walk handed it over; one holding no slots is never ranged
 * @param ctx - The walk's context, for its `textEditRange`
 */
export const readRangeEdit = (
	object: ObjectState,
	ctx: StyleContext,
): RangeEdit | null => {
	const range = ctx.textEditRange;
	if (range === null || range.objectId !== object.id) {
		return null;
	}
	const slots = textSlotsOf(object);
	if (slots === undefined || slots[range.slotId] === undefined) {
		return null;
	}
	return {
		slots,
		slotId: range.slotId,
		content: readRichTextSlot(slots, range.slotId),
		start: range.start,
		end: range.end,
	};
};
