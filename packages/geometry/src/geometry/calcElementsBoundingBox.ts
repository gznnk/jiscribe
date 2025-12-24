import { calcBoundingBox } from "./calcBoundingBox";
import type { Box } from "../types/Box";
import type { Frame } from "../types/Frame";
import type { Point } from "../types/Point";

/**
 * Calculate the bounding box of all provided elements.
 *
 * @param elements - The list of elements to calculate the bounding box for.
 * @returns The bounding box that encompasses all provided elements.
 */
export const calcElementsBoundingBox = (elements: (Point | Frame)[]): Box => {
	if (elements.length === 0) {
		return {
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
		};
	}

	const box = {
		top: Number.MAX_VALUE,
		left: Number.MAX_VALUE,
		right: Number.MIN_VALUE,
		bottom: Number.MIN_VALUE,
	};

	for (const element of elements) {
		const elementBox = calcBoundingBox(element);
		box.top = Math.min(box.top, elementBox.top);
		box.left = Math.min(box.left, elementBox.left);
		box.right = Math.max(box.right, elementBox.right);
		box.bottom = Math.max(box.bottom, elementBox.bottom);
	}

	return box;
};
