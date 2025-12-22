import type { Point } from "../../types/core/Point";
import type { Diagram } from "../../types/state/core/Diagram";
import { isItemableState } from "../../utils/validation/isItemableState";

/**
 * Recursively creates a map of item IDs to their position {x, y}.
 *
 * This function traverses all diagram items (including nested ones) and
 * builds a Map for fast ID-based lookup. Useful for high-performance scenarios.
 *
 * @param items - Array of diagram items to collect positions from
 * @returns Map where keys are item IDs and values are { x, y } coordinates
 */
export const createItemPositionMap = (items: Diagram[]): Map<string, Point> => {
	const positionMap = new Map<string, Point>();
	storeItemPositions(items, positionMap);
	return positionMap;
};

const storeItemPositions = (
	items: Diagram[],
	positionMap: Map<string, Point>,
): void => {
	for (const item of items) {
		positionMap.set(item.id, { x: item.x, y: item.y });
		if (isItemableState(item)) {
			storeItemPositions(item.items, positionMap);
		}
	}
};
