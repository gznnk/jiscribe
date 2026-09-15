import { getSelectionCenter } from "./getSelectionCenter";
import type { CanvasControllerState } from "../../../CanvasTypes";

/** Default offset used when the move-aware offset does not apply. */
export const DUPLICATE_OFFSET = { x: 20, y: 20 };

/**
 * Whether the objects created by the previous Duplicate/Paste are exactly the current
 * selection, which is the condition for chaining the next one off them.
 *
 * @param state - Compared as sets, so the order of selectedIds does not matter
 */
export function isLastDuplicateStillSelected(
	state: CanvasControllerState,
): boolean {
	const { lastDuplicate, selectedIds } = state;
	if (!lastDuplicate || lastDuplicate.newIds.length !== selectedIds.length) {
		return false;
	}

	const lastSet = new Set(lastDuplicate.newIds);
	return selectedIds.every((id) => lastSet.has(id));
}

/**
 * Computes the move-aware offset.
 *
 * - When the objects created by the previous duplicate are currently selected:
 *     use the distance the user moved as the next offset (the Figma approach);
 *     if barely moved, keep the previous offset
 * - Otherwise: use DUPLICATE_OFFSET
 */
export function computeDuplicateOffset(state: CanvasControllerState): {
	x: number;
	y: number;
} {
	const { lastDuplicate, selectedIds } = state;
	if (!lastDuplicate || !isLastDuplicateStillSelected(state)) {
		return DUPLICATE_OFFSET;
	}

	// Get the current selection center
	const center = getSelectionCenter(state, selectedIds);
	if (!center) {
		return lastDuplicate.offset;
	}

	const dx = center.cx - lastDuplicate.cx;
	const dy = center.cy - lastDuplicate.cy;

	// Barely moved (less than 1px) → keep the previous offset
	if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
		return lastDuplicate.offset;
	}

	// Adopt the distance moved as the new offset
	return { x: dx, y: dy };
}
