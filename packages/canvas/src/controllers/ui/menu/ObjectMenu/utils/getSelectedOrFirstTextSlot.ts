import { getFirstSelectedWithProp } from "./getFirstSelectedWithProp";
import type { TextSlot } from "../../../../../schemas/objects/types/TextSlot";
import type { TextStyleState } from "../../../../../states/objects/base/TextStyleState";
import { isTextStyleState } from "../../../../../states/objects/base/TextStyleState";
import { getFirstTextSlotId } from "../../../../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { resolveSelectedTextSlot } from "../../../../utils/resolveSelectedTextSlot";

/**
 * The slot the text menus show the current styling of: the slot selected one
 * level below the object when there is one, otherwise the first slot of the
 * first selected object that holds text (descendants of a selected group
 * included). The counterpart to the write side, which targets that same slot and
 * falls back to every slot of every selected object (TextSlotStyleProperty).
 *
 * @param state - The current canvas controller state; a stale `selectedTextSlot`
 *   is neutralized here (resolveSelectedTextSlot), so the raw value never reaches
 *   what the menus display
 * @returns The slot, or undefined when nothing selected holds text (the menus then show their defaults)
 */
export const getSelectedOrFirstTextSlot = (
	state: CanvasControllerState,
): TextSlot | undefined => {
	const selectedTextSlot = resolveSelectedTextSlot(state);
	if (selectedTextSlot !== null) {
		const target = state.objects[selectedTextSlot.objectId];
		if (isTextStyleState(target)) {
			return target.text?.[selectedTextSlot.slotId];
		}
	}

	const text = (
		getFirstSelectedWithProp(state.selectedIds, state.objects, "text") as
			| TextStyleState
			| undefined
	)?.text;
	const slotId = getFirstTextSlotId(text);
	return slotId === undefined ? undefined : text?.[slotId];
};
