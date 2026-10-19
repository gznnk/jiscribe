import type { ObjectPartKindRegistry } from "../../rendering/objects/registry/ObjectPartKindRegistry";
import type { CanvasControllerState } from "../CanvasTypes";
import { commitEdit } from "./commitEdit";
import {
	isTextSlotPart,
	TEXT_SLOT_PART_KIND,
} from "../selection/partKinds/textSlotPartKind";
import { readSelectedTextSlotOrder } from "../selection/readers/readSelectedTextSlotOrder";
import { selectTextSlot } from "../selection/writers/selectTextSlot";

/**
 * Grows the sole selected object past its last text slot through its
 * `textSlot` kind's `extend` (a table appending a row), committed, with the
 * selection moved onto the slot the growth lands on: the one `extend` names,
 * or else the first slot it added.
 *
 * @param state - The current canvas controller state; asked only when its
 *   selection picks the last slot of the selection's slot order
 *   (readSelectedTextSlotOrder) alone, which for an object of one slot is that
 *   slot
 * @param objectPartKind - Per-canvas registry of part kinds, which answers the
 *   slot order before and after the growth
 * @returns The grown state, or null when the selection is not on the last
 *   slot, or the kind declares no `extend` or it declines
 * @throws As readSelectedTextSlotOrder does; and when the grown object's `list` no longer
 *   names the old last slot or names nothing after it, and when `extend` names
 *   a landing slot that is not listed after it or that the object held before
 */
export const extendPastLastTextSlot = (
	state: CanvasControllerState,
	objectPartKind: ObjectPartKindRegistry,
): CanvasControllerState | null => {
	const slotOrder = readSelectedTextSlotOrder(state, objectPartKind);
	if (slotOrder === null) {
		return null;
	}
	const { target, textSlotPart, textSlotIds } = slotOrder;
	const lastSlotId = textSlotIds[textSlotIds.length - 1];
	const { part } = state.selection;
	const isOnLastSlot =
		isTextSlotPart(part) &&
		part.ranges.length === 1 &&
		part.ranges[0].anchorId === lastSlotId &&
		part.ranges[0].focusId === lastSlotId;
	if (!isOnLastSlot) {
		return null;
	}

	const extension = textSlotPart.extend?.(target) ?? null;
	if (extension === null) {
		return null;
	}
	const { object: extendedObject, landingPartId } = extension;
	const extendedSlotIds = textSlotPart.list?.(extendedObject) ?? [];
	const lastSlotIndex = extendedSlotIds.indexOf(lastSlotId);
	if (lastSlotIndex === -1 || lastSlotIndex === extendedSlotIds.length - 1) {
		throw new Error(
			`extendPastLastTextSlot: the "${TEXT_SLOT_PART_KIND}" part kind of "${target.type}" extended the object without listing a slot after "${lastSlotId}"`,
		);
	}
	const addedSlotIds = extendedSlotIds.slice(lastSlotIndex + 1);
	if (
		landingPartId !== undefined &&
		(!addedSlotIds.includes(landingPartId) ||
			textSlotIds.includes(landingPartId))
	) {
		throw new Error(
			`extendPastLastTextSlot: the "${TEXT_SLOT_PART_KIND}" part kind of "${target.type}" extended the object to land on "${landingPartId}", which is not a slot it added`,
		);
	}
	return commitEdit({
		...state,
		objects: { ...state.objects, [target.id]: extendedObject },
		selection: selectTextSlot(
			state.selection,
			extendedObject,
			landingPartId ?? addedSlotIds[0],
		),
		objectMenuOpenId: null,
	});
};
