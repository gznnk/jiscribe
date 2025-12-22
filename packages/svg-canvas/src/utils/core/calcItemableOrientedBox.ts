import { calcUnrotatedItemableBoundingBox } from "./calcUnrotatedItemableBoundingBox";
import type { Bounds } from "../../types/core/Bounds";
import type { Box } from "../../types/core/Box";
import type { ItemableState } from "../../types/state/core/ItemableState";
import { degreesToRadians } from "../math/common/degreesToRadians";
import { nanToZero } from "../math/common/nanToZero";
import { rotatePoint } from "../math/points/rotatePoint";
import { isFrame } from "../validation/isFrame";
import { isPoint } from "../validation/isPoint";

/**
 * Calculates the oriented bounding box of a group shape.
 * Returns the bounds that represent the item's position and size considering rotation.
 *
 * @param itemable - The itemable data containing items, position, and rotation
 * @returns The oriented bounding box with center position and original dimensions
 */
export const calcItemableOrientedBox = (itemable: ItemableState): Bounds => {
	if (!isPoint(itemable)) {
		throw new Error("Unsupported itemable state");
	}
	const { x, y } = itemable;
	const rotation = isFrame(itemable) ? itemable.rotation : 0;
	const { items } = itemable;
	const radians = degreesToRadians(rotation);

	// Calculate bounding box without rotation applied
	let boundingBox: Box;
	if (
		items.length === 0 ||
		itemable.itemableType === "composite" ||
		itemable.itemableType === "canvas"
	) {
		if (isFrame(itemable)) {
			const halfWidth = itemable.width / 2;
			const halfHeight = itemable.height / 2;
			boundingBox = {
				left: x - halfWidth,
				top: y - halfHeight,
				right: x + halfWidth,
				bottom: y + halfHeight,
			};
		} else {
			boundingBox = {
				left: x,
				top: y,
				right: x,
				bottom: y,
			};
		}
	} else {
		boundingBox = calcUnrotatedItemableBoundingBox(items, x, y, rotation);
	}

	// Rotate corner points around the group center
	const leftTop = rotatePoint(boundingBox.left, boundingBox.top, x, y, radians);
	const rightBottom = rotatePoint(
		boundingBox.right,
		boundingBox.bottom,
		x,
		y,
		radians,
	);

	// Return oriented box with center position and original dimensions
	return {
		x: leftTop.x + nanToZero(rightBottom.x - leftTop.x) / 2,
		y: leftTop.y + nanToZero(rightBottom.y - leftTop.y) / 2,
		width: boundingBox.right - boundingBox.left,
		height: boundingBox.bottom - boundingBox.top,
	};
};
