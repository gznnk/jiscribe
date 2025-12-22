import { calcDiagramBoundingBoxInUnrotatedGroup } from "./calcDiagramBoundingBoxInUnrotatedGroup";
import type { Diagram } from "../../types/state/core/Diagram";
import { isItemableState } from "../validation/isItemableState";

/**
 * Calculates the bounding box of an itemable container when its rotation is reset
 *
 * @param items - List of shapes in the itemable container
 * @param itemableCenterX - Itemable center X coordinate
 * @param itemableCenterY - Itemable center Y coordinate
 * @param itemableRotation - Itemable rotation angle
 * @param changeItem - Changed shape within the itemable
 * @returns Itemable bounding box
 */
export const calcUnrotatedItemableBoundingBox = (
	items: Diagram[],
	itemableCenterX = 0,
	itemableCenterY = 0,
	itemableRotation = 0,
	changeItem?: Diagram,
) => {
	if (items.length === 0) {
		throw new Error("Unsupported itemable state");
	}

	// Recursively process shapes in the itemable and calculate the coordinates of the itemable's four sides
	let top = Number.POSITIVE_INFINITY;
	let left = Number.POSITIVE_INFINITY;
	let bottom = Number.NEGATIVE_INFINITY;
	let right = Number.NEGATIVE_INFINITY;
	for (const item of items) {
		// Exclude ConnectPoint from shape calculations
		const itemItems = isItemableState(item)
			? (item.items ?? []).filter((i) => i.type !== "ConnectPoint")
			: [];
		if (
			0 < itemItems.length &&
			isItemableState(item) &&
			item.itemableType === "group"
		) {
			const itemableBoundingBox = calcUnrotatedItemableBoundingBox(
				itemItems,
				itemableCenterX,
				itemableCenterY,
				itemableRotation,
				changeItem,
			);
			top = Math.min(top, itemableBoundingBox.top);
			bottom = Math.max(bottom, itemableBoundingBox.bottom);
			left = Math.min(left, itemableBoundingBox.left);
			right = Math.max(right, itemableBoundingBox.right);
		} else {
			const boundingBox = calcDiagramBoundingBoxInUnrotatedGroup(
				item.id === changeItem?.id ? changeItem : item,
				itemableCenterX,
				itemableCenterY,
				itemableRotation,
			);
			top = Math.min(top, boundingBox.top);
			bottom = Math.max(bottom, boundingBox.bottom);
			left = Math.min(left, boundingBox.left);
			right = Math.max(right, boundingBox.right);
		}
	}

	return {
		top,
		bottom,
		left,
		right,
	};
};
