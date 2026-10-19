import { readRichTextSlot, TEXT_SLOT_PART_KIND } from "@jiscribe/canvas-sdk";
import type { CanvasControllerState } from "@jiscribe/canvas-sdk";

import type { ErEntityState } from "../state/ErEntityState";

/**
 * Opens the in-place editor on one slot of an entity, as the built-in Enter does
 * for a picked slot (StartTextEditCommand): the slot becomes the selection, which
 * is what names the slot being edited (see `textEditState`), and the session's
 * draft starts from the slot's text.
 *
 * @param state - The canvas; `entity` must already be in its `objects` under its own id, slot included
 * @param entity - The entity to edit; becomes the sole selection
 * @param slotId - A slot of `entity.text`, e.g. `col:2:name`
 * @returns The state with the slot picked and its editor open, any open menu section closed
 */
export const openErEntityTextSlotEditor = (
	state: CanvasControllerState,
	entity: ErEntityState,
	slotId: string,
): CanvasControllerState => ({
	...state,
	// An open submenu does not survive the edit session (StartTextEditCommand).
	objectMenuOpenId: null,
	selection: {
		objectIds: [entity.id],
		part: {
			kind: TEXT_SLOT_PART_KIND,
			ranges: [{ anchorId: slotId, focusId: slotId }],
		},
	},
	textEditState: {
		kind: "shape",
		text: readRichTextSlot(entity.text, slotId),
	},
});
