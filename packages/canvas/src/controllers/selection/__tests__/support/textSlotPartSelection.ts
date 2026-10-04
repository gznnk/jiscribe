import type { ObjectPartSelection } from "../../ObjectPartSelection";
import { TEXT_SLOT_PART_KIND } from "../../textSlotPartKind";

/**
 * The part selection a slot click writes, and the one every open shape text edit
 * sits on (see `textEditState`): one collapsed range over the slot key.
 *
 * @param slotId - Key of whichever object's `text` is selected; taken verbatim,
 *   so a fixture can hold a slot the object does not have
 * @returns A part selection to put in `CanvasSelection.part`
 */
export const textSlotPartSelection = (slotId: string): ObjectPartSelection => ({
	kind: TEXT_SLOT_PART_KIND,
	ranges: [{ anchorId: slotId, focusId: slotId }],
});
