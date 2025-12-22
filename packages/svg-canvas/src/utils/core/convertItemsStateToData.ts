import { DiagramRegistry } from "../../registry";
import type { DiagramData } from "../../types/data/core/DiagramData";
import type { ConnectPointData } from "../../types/data/shapes/ConnectPointData";
import type { Diagram } from "../../types/state/core/Diagram";
import { connectPointStateToData } from "../shapes/connectPoint/mapConnectPointStateToData";
import { isConnectableData } from "../validation/isConnectableData";
import { isItemableData } from "../validation/isItemableData";
import { isItemableState } from "../validation/isItemableState";

/**
 * Recursively converts state items to data format.
 * Uses DiagramRegistry to map each item from State to Data format,
 * and processes nested items recursively.
 *
 * @param items - Array of state items to convert
 * @returns Array of items in data format
 */
export const convertItemsStateToData = (items: Diagram[]): DiagramData[] => {
	return items.map((item) => {
		const stateToDataMapper = DiagramRegistry.getStateToDataMapper(item.type);
		let mappedItem: DiagramData;

		if (stateToDataMapper) {
			mappedItem = stateToDataMapper(item);
		} else {
			// Fallback: return the item as is if no mapper is found
			mappedItem = item;
		}

		// If the original state item has nested items, process them recursively
		if (isItemableState(item) && isItemableData(mappedItem)) {
			const mappedNestedItems = convertItemsStateToData(item.items);
			// Assign the recursively processed items to the mapped item
			mappedItem.items = mappedNestedItems;
		}

		// If the item is connectable, convert its connect points
		if (isConnectableData(mappedItem)) {
			mappedItem.connectPoints = mappedItem.connectPoints.map(
				(point) => connectPointStateToData(point) as ConnectPointData,
			);
		}

		return mappedItem;
	});
};
