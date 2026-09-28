import type { ObjectPartSelection } from "./ObjectPartSelection";
import { isTextStyleState } from "../../states/objects/base/TextStyleState";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Validates `state.objectPartSelection` against the current selection and objects, so a
 * part selection is visible to readers only while it still describes something real.
 * Checking on read rather than clearing on write follows commitTextEditIfNeeded /
 * graftTextEditDraft: selectedIds and the object map are rewritten from dozens of
 * places, none of which then has to know about parts.
 *
 * Part ids are looked up in the object's `text`, the keying every
 * `features.text === "slots"` type shares; no part definition is consulted.
 *
 * @param state - The current canvas controller state
 * @returns `state.objectPartSelection` itself (same reference, so memoized readers keep
 *   bailing out) when its object is the sole selection, declares `features.text ===
 *   "slots"` and still has the part; null in every other case
 */
export const resolveObjectPartSelection = (
	state: CanvasControllerState,
): ObjectPartSelection | null => {
	const { objectPartSelection, selectedIds } = state;
	if (objectPartSelection === null) {
		return null;
	}
	if (
		selectedIds.length !== 1 ||
		selectedIds[0] !== objectPartSelection.objectId
	) {
		return null;
	}

	const target = state.objects[objectPartSelection.objectId];
	if (target === undefined || target.features?.text !== "slots") {
		return null;
	}
	if (!isTextStyleState(target) || target.text === undefined) {
		return null;
	}
	if (
		!Object.prototype.hasOwnProperty.call(
			target.text,
			objectPartSelection.partIds[0],
		)
	) {
		return null;
	}
	return objectPartSelection;
};
