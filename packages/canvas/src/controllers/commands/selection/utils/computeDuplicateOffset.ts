import { getSelectionCenter } from "./getSelectionCenter";
import type { CanvasControllerState } from "../../../CanvasTypes";

/** Default offset used when the move-aware offset does not apply. */
export const DUPLICATE_OFFSET = { x: 20, y: 20 };

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
	if (!lastDuplicate) {
		return DUPLICATE_OFFSET;
	}

	// Check whether the selection set matches the previous duplicate result
	if (lastDuplicate.newIds.length !== selectedIds.length) {
		return DUPLICATE_OFFSET;
	}
	const lastSet = new Set(lastDuplicate.newIds);
	if (!selectedIds.every((id) => lastSet.has(id))) {
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
