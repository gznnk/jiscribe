import { isTextStyleState } from "../../states/objects/base/TextStyleState";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Validates `state.selectedTextSlot` against the current selection and objects, so a
 * slot selection is visible to readers only while it still describes something real.
 * Checking on read rather than clearing on write follows commitTextEditIfNeeded /
 * graftTextEditDraft: selectedIds and the object map are rewritten from dozens of
 * places, none of which then has to know about slots.
 *
 * @param state - The current canvas controller state
 * @returns `state.selectedTextSlot` itself (same reference, so memoized readers keep
 *   bailing out) when its object is the sole selection, declares `features.text ===
 *   "slots"` and still has the slot; null in every other case
 */
export const resolveSelectedTextSlot = (
	state: CanvasControllerState,
): CanvasControllerState["selectedTextSlot"] => {
	const { selectedTextSlot, selectedIds } = state;
	if (selectedTextSlot === null) {
		return null;
	}
	if (
		selectedIds.length !== 1 ||
		selectedIds[0] !== selectedTextSlot.objectId
	) {
		return null;
	}

	const target = state.objects[selectedTextSlot.objectId];
	if (target === undefined || target.features?.text !== "slots") {
		return null;
	}
	if (!isTextStyleState(target) || target.text === undefined) {
		return null;
	}
	if (
		!Object.prototype.hasOwnProperty.call(target.text, selectedTextSlot.slotId)
	) {
		return null;
	}
	return selectedTextSlot;
};
