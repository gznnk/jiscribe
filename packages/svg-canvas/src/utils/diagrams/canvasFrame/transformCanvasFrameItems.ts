import type { Frame } from "../../../types/core/Frame";
import type { Diagram } from "../../../types/state/core/Diagram";

/**
 * Transform items for CanvasFrame.
 * CanvasFrame maintains the current shape as-is and does not modify its child items.
 *
 * @param _ownerFrame - The frame of the CanvasFrame (not used but required by interface)
 * @param items - The child items to transform
 * @returns The same items without any transformation
 */
export const transformCanvasFrameItems = (
	_ownerFrame: Frame,
	items: Diagram[],
): Diagram[] => {
	// CanvasFrame maintains its items as-is without any transformation
	return items;
};