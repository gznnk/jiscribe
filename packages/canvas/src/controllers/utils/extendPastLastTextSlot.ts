import type { ObjectPartKindRegistry } from "../../rendering/objects/registry/ObjectPartKindRegistry";
import type { CanvasControllerState } from "../CanvasTypes";
import { commitEdit } from "./commitEdit";
import {
	isTextSlotPart,
	TEXT_SLOT_PART_KIND,
} from "../selection/partKinds/textSlotPartKind";
import { getTextSlotCycle } from "../selection/writers/selectAdjacentTextSlot";
import { selectTextSlot } from "../selection/writers/selectTextSlot";

/**
 * Grows the sole selected object past its last text slot through its
 * `textSlot` kind's `extend` (a table appending a row), committed, with the
 * selection moved onto the first slot the growth added.
 *
 * @param state - The current canvas controller state; asked only when its
 *   selection picks the last slot of a slot cycle (getTextSlotCycle) alone
 * @param objectPartKind - Per-canvas registry of part kinds, which answers the
 *   slot order before and after the growth
 * @returns The grown state, or null when the selection is not on the last
 *   slot, or the kind declares no `extend` or it declines
 * @throws As getTextSlotCycle does, and when the grown object's `list` no
 *   longer names the old last slot or names nothing after it
 */
export const extendPastLastTextSlot = (
	state: CanvasControllerState,
	objectPartKind: ObjectPartKindRegistry,
): CanvasControllerState | null => {
	const cycle = getTextSlotCycle(state, objectPartKind);
	if (cycle === null) {
		return null;
	}
	const { target, textSlotPart, textSlotIds } = cycle;
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

	const extendedObject = textSlotPart.extend?.(target) ?? null;
	if (extendedObject === null) {
		return null;
	}
	const extendedSlotIds = textSlotPart.list?.(extendedObject) ?? [];
	const lastSlotIndex = extendedSlotIds.indexOf(lastSlotId);
	if (lastSlotIndex === -1 || lastSlotIndex === extendedSlotIds.length - 1) {
		throw new Error(
			`extendPastLastTextSlot: the "${TEXT_SLOT_PART_KIND}" part kind of "${target.type}" extended the object without listing a slot after "${lastSlotId}"`,
		);
	}
	return commitEdit({
		...state,
		objects: { ...state.objects, [target.id]: extendedObject },
		selection: selectTextSlot(
			state.selection,
			extendedObject,
			extendedSlotIds[lastSlotIndex + 1],
		),
		objectMenuOpenId: null,
	});
};
