import { getFirstSelectedWithProp } from "./getFirstSelectedWithProp";
import type { TextSlot } from "../../../../../schemas/objects/types/TextSlot";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../../../../states/objects/base/TextStyleState";
import { getFirstTextSlotId } from "../../../../../states/objects/types/TextSlots";

/**
 * The slot the text menus show the current styling of: the first slot of the
 * first selected object that holds text (descendants of a selected group
 * included). The counterpart to the write side, which applies the change to
 * every slot of every selected object (TextSlotStyleProperty).
 *
 * @param selectedIds - Currently selected object ids, in selection order
 * @param objects - All objects, used to resolve the ids and their descendants
 * @returns The slot, or undefined when nothing selected holds text (the menus then show their defaults)
 */
export const getFirstSelectedTextSlot = (
	selectedIds: string[],
	objects: Record<string, ObjectState>,
): TextSlot | undefined => {
	const text = (
		getFirstSelectedWithProp(selectedIds, objects, "text") as
			| TextStyleState
			| undefined
	)?.text;
	const slotId = getFirstTextSlotId(text);
	return slotId === undefined ? undefined : text?.[slotId];
};
