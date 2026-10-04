import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../../../states/objects/base/TextStyleState";
import { isTextStyleState } from "../../../../states/objects/base/TextStyleState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { TEXT_SLOT_PART_KIND } from "../../../selection/textSlotPartKind";

/**
 * The object whose slots Tab / Shift+Tab walk through: the sole selection, when
 * it spells its text out as slots. Returning the object rather than a boolean
 * lets the command's availability check and its execution share one resolution.
 *
 * @param state - The current canvas controller state
 * @returns The selected object, narrowed to one carrying `text`, or null when
 *   the selection does not qualify — including during any drag, where the
 *   selection must not move (same guard as the other selection commands)
 */
export const getTextSlotCycleTarget = (
	state: CanvasControllerState,
): (ObjectState & TextStyleState) | null => {
	if (state.activeDrag !== null) {
		return null;
	}
	if (state.selection.objectIds.length !== 1) {
		return null;
	}
	const target = state.objects[state.selection.objectIds[0]];
	if (target === undefined || target.features?.text !== "slots") {
		return null;
	}
	if (!isTextStyleState(target) || target.text === undefined) {
		return null;
	}
	return target;
};

/**
 * Moves the slot selection one step along the object's slot order (the key order
 * of `state.text`), wrapping around at either end.
 *
 * @param state - The current canvas controller state; its `selection.part`
 *   names the slot the step starts from, and is live rather than stale because the
 *   reducer reconciles it (reconcileSelection)
 * @param step - 1 for the next slot, -1 for the previous; with no slot selected
 *   yet these enter at the first and the last slot respectively
 * @returns A new state with `selection.part` moved and any open ObjectMenu submenu
 *   closed, or the input state when the selection does not qualify or the object
 *   declares no slot at all
 */
export const selectAdjacentTextSlot = (
	state: CanvasControllerState,
	step: 1 | -1,
): CanvasControllerState => {
	const target = getTextSlotCycleTarget(state);
	if (target === null) {
		return state;
	}
	const slotIds = Object.keys(target.text ?? {});
	if (slotIds.length === 0) {
		return state;
	}

	// Tab walks one slot at a time, so the step starts from the active range's
	// moving end — in this version the only end there is, every range being
	// collapsed — and lands on a collapsed range of its own.
	const ranges = state.selection.part?.ranges;
	const currentSlotId =
		ranges === undefined ? undefined : ranges[ranges.length - 1].focusId;
	const currentIndex =
		currentSlotId === undefined ? -1 : slotIds.indexOf(currentSlotId);
	const nextIndex =
		currentIndex === -1
			? step === 1
				? 0
				: slotIds.length - 1
			: (currentIndex + step + slotIds.length) % slotIds.length;

	return {
		...state,
		selection: {
			...state.selection,
			part: {
				kind: TEXT_SLOT_PART_KIND,
				ranges: [{ anchorId: slotIds[nextIndex], focusId: slotIds[nextIndex] }],
			},
		},
		objectMenuOpenId: null,
	};
};
